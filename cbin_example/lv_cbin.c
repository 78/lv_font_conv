#include "lv_cbin.h"
#include <stdio.h>

#define MAX(A,B) (A<B?B:A)

static void* malloc_cpy(void* src, size_t sz) {
    void* p = lv_malloc(sz);
    LV_ASSERT_MALLOC(p);
    memcpy(p, src, sz);
    return p;
}

static void addr_add(void** addr, int add) {
    if(*addr)
        *addr += add;
}

lv_img_dsc_t* cbin_img_dsc_create(uint8_t* bin_addr) {
    lv_img_dsc_t* img_dsc = malloc_cpy(bin_addr, sizeof(lv_img_dsc_t));
    addr_add(&img_dsc->data, bin_addr);
    return img_dsc;
}

lv_font_t* cbin_font_create(uint8_t* bin_addr) {

    lv_font_t* font = malloc_cpy(bin_addr, sizeof(lv_font_t));

    font->get_glyph_dsc = lv_font_get_glyph_dsc_fmt_txt;
    font->get_glyph_bitmap = lv_font_get_bitmap_fmt_txt;

    bin_addr += (int)font->dsc;
    lv_font_fmt_txt_dsc_t* dsc = font->dsc = malloc_cpy(bin_addr, sizeof(lv_font_fmt_txt_dsc_t));

    addr_add(&dsc->glyph_bitmap, bin_addr);
    addr_add(&dsc->glyph_dsc, bin_addr);

    if(dsc->cmap_num) {
        uint8_t* cmaps_addr = bin_addr + (int)dsc->cmaps;
        dsc->cmaps = malloc_cpy(cmaps_addr, sizeof(lv_font_fmt_txt_cmap_t)*dsc->cmap_num);

        for(int i=0; i<dsc->cmap_num; i++) {
            lv_font_fmt_txt_cmap_t* cm = &dsc->cmaps[i];
            addr_add(&cm->unicode_list, cmaps_addr);
            addr_add(&cm->glyph_id_ofs_list, cmaps_addr);
        }
    }

    if(dsc->kern_dsc) {
        uint8_t* kern_addr = bin_addr + (int)dsc->kern_dsc;
        if(dsc->kern_classes == 1) {
            lv_font_fmt_txt_kern_classes_t* kcl = dsc->kern_dsc = malloc_cpy(kern_addr, sizeof(lv_font_fmt_txt_kern_classes_t));
            addr_add(&kcl->class_pair_values, kern_addr);
            addr_add(&kcl->left_class_mapping, kern_addr);
            addr_add(&kcl->right_class_mapping, kern_addr);
        } else if(dsc->kern_classes == 0) {
            lv_font_fmt_txt_kern_pair_t* kp = dsc->kern_dsc = malloc_cpy(kern_addr, sizeof(lv_font_fmt_txt_kern_pair_t));
            addr_add(&kp->glyph_ids, kern_addr);
            addr_add(&kp->values, kern_addr);
        }
    }

    return font;
}

void cbin_font_delete(lv_font_t* font) {
    lv_font_fmt_txt_dsc_t* dsc = font->dsc;
    lv_free(dsc->cmaps);
    lv_free(dsc->kern_dsc);
    lv_free(dsc);
    lv_free(font);
}