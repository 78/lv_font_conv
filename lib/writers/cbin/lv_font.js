'use strict';


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
    const cmaps_buf = this.cmap.toCBin();
    const kern_buf = this.kern.toCBin();

    const sz_font = 36;
    const sz_font_dsc = 20;
    const head_buf = Buffer.alloc(sz_font+sz_font_dsc );
    var pos = 0;
    // write lv_font_t 
    head_buf.writeUInt32LE(0, pos); pos+=4;
    head_buf.writeUInt32LE(0, pos); pos+=4;
    head_buf.writeUInt32LE(0, pos); pos+=4;
    head_buf.writeUInt32LE(this.src.ascent-this.src.descent, pos); pos+=4; //line_height
    head_buf.writeUInt32LE(-this.src.descent, pos); pos+=4; // base_line

    head_buf.writeUInt8(this.src.subpixels_mode/*and kerning*/, pos); pos+=1;
    head_buf.writeInt8(this.src.underlinePosition, pos); pos+=1;
    head_buf.writeInt8(this.src.underlineThickness, pos); pos+=1;
    pos += 1;// pad

    head_buf.writeUInt32LE(sz_font, pos); pos+=4; // offset relative to start of lv_font_t
    head_buf.writeUInt32LE(0, pos); pos+=4;
    head_buf.writeUInt32LE(0, pos); pos+=4;
    
    const kern = this.head.kern_ref();
    // write lv_font_fmt_txt_dsc_t
    head_buf.writeUInt32LE(sz_font_dsc+kern_buf.length, pos); pos+=4;  // glyph_bitmap offset relative to start of lv_font_fmt_txt_dsc_t
    head_buf.writeUInt32LE(sz_font_dsc+kern_buf.length+bitmap_buf.length, pos); pos+=4;  // glyph_dsc ofs
    head_buf.writeUInt32LE(sz_font_dsc+kern_buf.length+bitmap_buf.length+glyph_dsc_buf.length, pos); pos+=4;  // cmaps ofs
    head_buf.writeUInt32LE(kern.dsc==='NULL'?0:sz_font_dsc, pos); pos+=4; // kern ofs
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
