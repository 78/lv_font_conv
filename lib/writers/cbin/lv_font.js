'use strict';

/* modify  accordingly */
const ptr_size = 4;
Buffer.prototype['writeUInt64LE']= function(val, pos) {
  this.writeUInt32LE(val, pos);this.writeUInt32LE(0, pos+4);
};

const path = require('path');

const Font = require('../../font/font');
const Head = require('./lv_table_head');
const Cmap = require('./lv_table_cmap');
const Glyf = require('./lv_table_glyf');
const Kern = require('./lv_table_kern');
const AppError = require('../../app_error');

class CBinFont extends Font {
  constructor(fontData, options) {
    super(fontData, options);

    this.font_name = options.lv_font_name;
    if (!this.font_name) {
      const ext = path.extname(options.output);
      this.font_name = path.basename(options.output, ext);
    }

    if (options.bpp === 3 & options.no_compress) {
      throw new AppError('LittlevGL supports "--bpp 3" with compression only');
    }
  }

  init_tables() {
    this.head = new Head(this);
    this.glyf = new Glyf(this);
    this.cmap = new Cmap(this);
    this.kern = new Kern(this);
  }

  toCBin() {

    const [bitmap_buf, glyph_dsc_buf] = this.glyf.toCBin();
    const cmaps_buf = this.cmap.toCBin(ptr_size);
    const kern_buf = this.kern.toCBin(ptr_size);
    
    const sz_font = 12+ptr_size*6 +(ptr_size==4?0: 4);// add pad, see below
    const sz_font_dsc = 4+ptr_size*4;
    const head_buf = Buffer.alloc(sz_font+sz_font_dsc ); 

    const writePTR = (ptr_size==4?head_buf.writeUInt32LE:head_buf.writeUInt64LE).bind(head_buf);

    var pos = 0;
    // write lv_font_t 
    writePTR(0, pos); pos+=ptr_size;
    writePTR(0, pos); pos+=ptr_size;
    writePTR(0, pos); pos+=ptr_size;
    head_buf.writeUInt32LE(this.src.ascent-this.src.descent, pos); pos+=4; //line_height
    head_buf.writeInt32LE(-this.src.descent, pos); pos+=4; // base_line

    head_buf.writeUInt8(this.src.subpixels_mode/*and kerning*/, pos); pos+=1;
    head_buf.writeInt8(this.src.underlinePosition, pos); pos+=1;
    head_buf.writeInt8(this.src.underlineThickness, pos); pos+=1;
    pos += 1+ (ptr_size==4?0: 4);// pad

    writePTR(sz_font, pos); pos+=ptr_size; // offset relative to start of lv_font_t
    writePTR(0, pos); pos+=ptr_size;
    writePTR(0, pos); pos+=ptr_size;
    
    const kern = this.head.kern_ref();
    // write lv_font_fmt_txt_dsc_t
    writePTR(sz_font_dsc+kern_buf.length, pos); pos+=ptr_size;  // glyph_bitmap offset relative to start of lv_font_fmt_txt_dsc_t
    writePTR(sz_font_dsc+kern_buf.length+bitmap_buf.length, pos); pos+=ptr_size;  // glyph_dsc ofs
    writePTR(sz_font_dsc+kern_buf.length+bitmap_buf.length+glyph_dsc_buf.length, pos); pos+=ptr_size;  // cmaps ofs
    writePTR(kern.dsc==='NULL'?0:sz_font_dsc, pos); pos+=ptr_size; // kern ofs
    head_buf.writeUInt16LE(kern.scale, pos); pos+=2;

    const cmap_num = this.cmap.toBin().readUInt32LE(8);
    const bpp = this.opts.bpp;
    const kern_classes = kern.classes;
    const bitmap_format = this.glyf.getCompressionCode();
    head_buf.writeUInt16LE(cmap_num|(bpp<<9)|(kern_classes<<(9+4))|(bitmap_format<<(9+4+1)), pos); pos+=2;

    return Buffer.concat([
            head_buf, 
            kern_buf, 
            bitmap_buf, 
            glyph_dsc_buf, 
            cmaps_buf
        ]);
  }
}


module.exports = CBinFont;
