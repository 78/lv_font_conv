'use strict';


const u = require('../../utils');
const Kern = require('../../font/table_kern');


class LvKern extends Kern {
  constructor(font) {
    super(font);
  }

  to_cbin_format0() {
    const f = this.font;
    let kern_pairs = this.collect_format0_data();
    let step = f.glyphIdFormat==1?2:1;
    glyph_ids = Buffer.alloc(u.align4(kern_pairs.length*2*step));
    let write_fn = f.glyphIdFormat==1?glyph_ids.writeUInt16LE:glyph_ids.writeUInt8;
    kern_pairs.forEach((pair, i)=>{
      write_fn(pair[0], i*2*step);
      write_fn(pair[1], i*2*step+step);
    });
    values = u.balign4(kern_pairs.map(pair => f.kernToFP(pair[2])));
    // lv_font_fmt_txt_kern_pair_t
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(buf.length, 0);
    buf.writeUInt32LE(buf.length+glyph_ids.length, 4);
    buf.writeUInt32LE(kern_pairs.length|(f.glyphIdFormat<<30), 8);

    return Buffer.concat([buf, glyph_ids, values]);
  }

  to_cbin_format3() {
    const {
      left_classes,
      right_classes,
      left_mapping,
      right_mapping,
      values
    } = this.collect_format3_data();
    
    left_mapping = u.balign4(left_mapping);
    right_mapping = u.align4(right_mapping);
    values = u.balign4(values);

    // lv_font_fmt_txt_kern_classes_t
    const buf = Buffer.alloc(16); // only need 14, but I pad it to multiple of 4
    buf.writeUInt32LE(buf.length, 0); //class_pair_values
    buf.writeUInt32LE(buf.length+values.length, 4); // left_class_mapping
    buf.writeUInt32LE(buf.length+values.length+left_mapping.length, 8); // right_class_mapping
    buf.writeUInt8(left_classes, 12); // left_class_cnt
    buf.writeUInt8(right_classes, 13); // right_class_cnt
    
    return Buffer.concat([buf, values, left_mapping, right_mapping]);
  }


  toCBin() {
    const f = this.font;
    if(!f.hasKerning()) return Buffer.alloc(0);

    if (f.kern.should_use_format3()) {
      if (f.kern.format3_forced) {
        let diff = this.create_format3_data().length - this.create_format0_data().length;
        console.log(`Forced faster kerning format (via classes). Size increase is ${diff} bytes.`);
      }
      return this.to_cbin_format3();
    }

    if (this.font.opts.fast_kerning) {
      console.log('Forced faster kerning format (via classes), but data exceeds it\'s limits. Continue use pairs.');
    }
    return this.to_cbin_format0();
  }
}


module.exports = LvKern;
