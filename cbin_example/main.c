#include "lv_cbin.h"

extern void* bin_addr;

void main() {

    lv_font_t* font = cbin_font_create(bin_addr);

    ...

    lv_obj_t* lbl = lv_label_create(lv_screen_active());
    lv_obj_set_style_text_font(lbl, font, 0);

    ...

    // cbin_fint_delete(font);
}