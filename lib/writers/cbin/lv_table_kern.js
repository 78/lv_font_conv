'use strict';


const u = require('../../utils');
const Kern = require('../../font/table_kern');


class LvKern extends Kern {
  constructor(font) {
    super(font);
  }

  to_cbin_format0(ptr_size) {
    const f = this.font;
    let kern_pairs = this.collect_format0_data();
    let step = f.glyphIdFormat==1?2:1;
    let glyph_ids = Buffer.alloc(u.align4(kern_pairs.length*2*step));
    let write_fn = (f.glyphIdFormat==1?glyph_ids.writeUInt16LE:glyph_ids.writeUInt8).bind(glyph_ids);
    kern_pairs.forEach((pair, i)=>{
      write_fn(pair[0], i*2*step);
      write_fn(pair[1], i*2*step+step);
    });
    let values = u.balign4(Buffer.from(kern_pairs.map(pair => f.kernToFP(pair[2]))));
    // lv_font_fmt_txt_kern_pair_t
    const buf = Buffer.alloc(4+ptr_size*2);
    const writePTR = (ptr_size==4?buf.writeUInt32LE:buf.writeUInt64LE).bind(buf);
    writePTR(buf.length, 0);
    writePTR(buf.length+glyph_ids.length, ptr_size);
    buf.writeUInt32LE(kern_pairs.length|(f.glyphIdFormat<<30), ptr_size*2);

    return Buffer.concat([buf, glyph_ids, values]);
  }

  to_cbin_format3(ptr_size) {
    let {
      left_classes,
      right_classes,
      left_mapping,
      right_mapping,
      values
    } = this.collect_format3_data();
    left_mapping = u.balign4(Buffer.from(left_mapping));
    right_mapping = u.balign4(Buffer.from(right_mapping));
    values = u.balign4(Buffer.from(values));

    // lv_font_fmt_txt_kern_classes_t
    const buf = Buffer.alloc(4+ptr_size*3); // only need 14, but I pad it to multiple of 4
    const writePTR = (ptr_size==4?buf.writeUInt32LE:buf.writeUInt64LE).bind(buf);
    let ofs=0;
    writePTR(buf.length, ofs); ofs+=ptr_size;//class_pair_values
    writePTR(buf.length+values.length, ofs); ofs+=ptr_size;// left_class_mapping
    writePTR(buf.length+values.length+left_mapping.length, ofs); ofs+=ptr_size;// right_class_mapping
    buf.writeUInt8(left_classes, ofs); ofs+=1;// left_class_cnt
    buf.writeUInt8(right_classes, ofs); ofs+=1;// right_class_cnt
    
    return Buffer.concat([buf, values, left_mapping, right_mapping]);
  }


  toCBin(ptr_size) {
    const f = this.font;
    if(!f.hasKerning()) return Buffer.alloc(0);

    if (f.kern.should_use_format3()) {
      if (f.kern.format3_forced) {
        let diff = this.create_format3_data().length - this.create_format0_data().length;
        console.log(`Forced faster kerning format (via classes). Size increase is ${diff} bytes.`);
      }
      return this.to_cbin_format3(ptr_size);
    }

    if (this.font.opts.fast_kerning) {
      console.log('Forced faster kerning format (via classes), but data exceeds it\'s limits. Continue use pairs.');
    }
    return this.to_cbin_format0(ptr_size);
  }
}


module.exports = LvKern;
