'use strict';


const { BitStream } = require('bit-buffer');
const u = require('../../utils');
const Glyf = require('../../font/table_glyf');


class LvGlyf extends Glyf {
  constructor(font) {
    super(font);

    this.lv_data = [];
    this.lv_compiled = false;
  }

  lv_bitmap(glyph) {
    const buf = Buffer.alloc(100 + glyph.bbox.width * glyph.bbox.height * 4);
    const bs = new BitStream(buf);
    bs.bigEndian = true;

    const pixels = this.font.glyf.pixelsToBpp(glyph.pixels);

    this.font.glyf.storePixels(bs, pixels);

    const glyph_bitmap = Buffer.alloc(bs.byteIndex);
    buf.copy(glyph_bitmap, 0, 0, bs.byteIndex);

    return glyph_bitmap;
  }

  lv_compile() {
    if (this.lv_compiled) return;

    this.lv_compiled = true;

    const f = this.font;
    this.lv_data = [];
    let offset = 0;

    f.src.glyphs.forEach(g => {
      const id = f.glyph_id[g.code];
      const bin = this.lv_bitmap(g);
      this.lv_data[id] = {
        bin,
        offset,
        glyph: g
      };
      offset += bin.length;
    });
  }


  toCBin() {
    // LV_FONT_FMT_TXT_LARGE == 1
    this.lv_compile();
    const bitmap_buf = u.balign4(Buffer.concat(this.lv_data.slice(1).map(d=>d.bin)));
    const glyph_dsc_buf = Buffer.alloc(this.lv_data.length * 16 + 16);
    let i=1;
    this.lv_data.forEach(d=>{
      const adv_w = Math.round(d.glyph.advanceWidth * 16);
      glyph_dsc_buf.writeUInt32LE(d.offset, i*16);
      glyph_dsc_buf.writeUInt32LE(adv_w, i*16+4);
      glyph_dsc_buf.writeUInt16LE(d.glyph.bbox.width, i*16+8);
      glyph_dsc_buf.writeUInt16LE(d.glyph.bbox.height, i*16+10);
      glyph_dsc_buf.writeInt16LE(d.glyph.bbox.x, i*16+12);
      glyph_dsc_buf.writeInt16LE(d.glyph.bbox.y, i*16+14);
      i++;
    });
    return [bitmap_buf, glyph_dsc_buf];
  }
}


module.exports = LvGlyf;
