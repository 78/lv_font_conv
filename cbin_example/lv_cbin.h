#pragma once

#include "lvgl.h"

lv_img_dsc_t* cbin_img_dsc_create(uint8_t* bin_addr);
static inline void cbin_img_dsc_delete(lv_img_dsc_t* img_dsc) {
    lv_free(img_dsc);
}


lv_font_t* cbin_font_create(uint8_t* bin_addr);
void cbin_font_delete(lv_font_t* font);