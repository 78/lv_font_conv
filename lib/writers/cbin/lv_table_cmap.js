'use strict';


const u = require('../../utils');
const build_subtables = require('../../font/cmap_build_subtables');
const Cmap = require('../../font/table_cmap');


class LvCmap extends Cmap {
  constructor(font) {
    super(font);

    this.lv_compiled = false;
    this.lv_subtables = [];
  }

  lv_format2enum(name) {
    switch (name) {
      case 'format0_tiny': return 'LV_FONT_FMT_TXT_CMAP_FORMAT0_TINY';
      case 'format0': return 'LV_FONT_FMT_TXT_CMAP_FORMAT0_FULL';
      case 'sparse_tiny': return 'LV_FONT_FMT_TXT_CMAP_SPARSE_TINY';
      case 'sparse': return 'LV_FONT_FMT_TXT_CMAP_SPARSE_FULL';
      default: throw new Error('Unknown subtable format');
    }
  }

  lv_format2int(name) {
    return ['format0','sparse','format0_tiny','sparse_tiny'].indexOf(name);
  }

  toCBin() {    
    const f = this.font;

    let subtables_plan = build_subtables(f.src.glyphs.map(g => g.code));
    let idx = 0;

    const cmaps_buf = Buffer.alloc(subtables_plan.length*20);
    const arr_list = [];

    for (let [ format, codepoints ] of subtables_plan) {
      let g = this.glyphByCode(codepoints[0]);
      let start_glyph_id = f.glyph_id[g.code];
      let min_code = codepoints[0];
      let max_code = codepoints[codepoints.length - 1];

      let has_charcodes = false;
      let has_ids = false;
      let defs = '';
      let entries_count = 0;

      var addr_ofs=cmaps_buf.length;
      var glyph_ptr, unicode_ptr;
      glyph_ptr = unicode_ptr = Buffer.alloc(0);
      if (format === 'format0_tiny') {
        // use default empty values
      } else if (format === 'format0') {
        has_ids = true;
        let d = this.collect_format0_data(min_code, max_code, start_glyph_id);
        entries_count = d.length;

        unicode_ptr = u.balign4(Buffer.from(d));

      } else if (format === 'sparse_tiny') {
        has_charcodes = true;
        let d = this.collect_sparse_data(codepoints, start_glyph_id);
        entries_count = d.codes.length;

        unicode_ptr = u.balign4(Buffer.from(Uint16Array.from(d.codes).buffer));

      } else { // assume format === 'sparse'
        has_charcodes = true;
        has_ids = true;
        let d = this.collect_sparse_data(codepoints, start_glyph_id);
        entries_count = d.codes.length;

        unicode_ptr = u.balign4(Buffer.from(Uint16Array.from(d.codes).buffer));
        glyph_ptr = u.align4(Buffer.from(Uint16Array.from(d.ids).buffer));
      }

      const u_list = has_charcodes ? `unicode_list_${idx}` : 'NULL';
      const id_list = has_ids ? `glyph_id_ofs_list_${idx}` : 'NULL';

      /* eslint-disable max-len */
      cmaps_buf.writeUInt32LE(min_code, idx*20);
      cmaps_buf.writeUInt16LE(max_code-min_code+1, idx*20+4);
      cmaps_buf.writeUInt16LE(start_glyph_id, idx*20+6);
      cmaps_buf.writeUInt32LE(has_charcodes?addr_ofs:0, idx*20+8); addr_ofs+=unicode_ptr.length;
      cmaps_buf.writeUInt32LE(has_ids?addr_ofs:0, idx*20+12); addr_ofs+=glyph_ptr.length;
      cmaps_buf.writeUInt16LE(entries_count, idx*20+16);
      cmaps_buf.writeUInt8(this.lv_format2int(format), idx*20+18);

      arr_list.push(unicode_ptr);
      arr_list.push(glyph_ptr);

      idx++;
    }
    return Buffer.concat([cmaps_buf, ...arr_list]);
  }



}


module.exports = LvCmap;
