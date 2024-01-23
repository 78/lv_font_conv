'use strict';


const Head = require('../../font/table_head');


class LvHead extends Head {
  constructor(font) {
    super(font);
  }

  kern_ref() {
    const f = this.font;

    if (!f.hasKerning()) {
      return {
        scale:   '0',
        dsc:     'NULL',
        classes: '0'
      };
    }

    if (!f.kern.should_use_format3()) {
      return {
        scale: `${Math.round(f.kerningScale * 16)}`,
        dsc: '&kern_pairs',
        classes: '0'
      };
    }

    return {
      scale: `${Math.round(f.kerningScale * 16)}`,
      dsc: '&kern_classes',
      classes: '1'
    };
  }

}


module.exports = LvHead;
