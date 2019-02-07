import { Component, OnInit, OnDestroy, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { MatChipInputEvent } from '@angular/material';
import { ENTER, COMMA } from '@angular/cdk/keycodes';

import { NgForm } from '@angular/forms';

import * as tinymce from 'tinymce/tinymce';

import { CacheService, HelpersService, ImageSelectComponent } from '../../imports';
import { ArticleRequestService } from '../../services/article-request.service';

import { Subscription } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-article-add',
  templateUrl: './article-add.component.html',
  styleUrls: ['./article-add.component.sass']
})
export class ArticleAddComponent implements OnInit, OnDestroy {

  editor: any;

  languages: any;

  categories: Array<any> = [];

  keywords: Array<string> = [];

  image_name: string;

  separatorKeysCodes = [ENTER, COMMA];

  subs = new Subscription();

  @Input() elementId = 'tinymce-textarea';

  @Output() editorKeyup = new EventEmitter<any>();

  @ViewChild('tiny') set tiny(tiny: any) {
    if (this.isPageReady) {
      setTimeout(() => this.runTinymce(), 0);
    }
  }

  get isPageReady() {

    return this.languages && this.categories;
  }

  constructor(
    private articleRequestService: ArticleRequestService,
    private cacheService: CacheService,
    private helpersService: HelpersService,
    private dialog: MatDialog
  ) {
    this.cacheService.get('languages', this.articleRequestService.makeGetRequest('admin.languages'))
      .subscribe(response => this.languages = response.slice(0));

    this.cacheService.get('categories', this.articleRequestService.makeGetRequest('admin.categories'))
      .subscribe(response => {
        this.categories = Array.from(response);

        this.categories.map(category => {
          category.exist = false;
          return category;
        });
      });

  }

  ngOnInit() {
  }

  ngOnDestroy() {
    tinymce.remove(this.editor);

    this.subs.unsubscribe();
  }

  runTinymce() {
    tinymce.init({
      height: '420',
      selector: '#' + this.elementId,
      plugins: ['link', 'paste', 'table', 'image'],
      toolbar: 'image',
      skin_url: '/assets/skins/lightgray',
      setup: editor => {

        const dialog = this.dialog;

        editor.on('keyup', () => {

          const content = editor.getContent();
          this.editorKeyup.emit(content);
        });

        editor.addMenuItem('myitem', {
          text: 'Add Image',
          context: 'tools',
          onclick: () => {
            const ImageSelectDialog = dialog.open(ImageSelectComponent, {
              data: {
                image_request: this.articleRequestService.makeGetRequest('image.images'),
                thumb_image_url: this.articleRequestService.makeUrl('storage.images')
              }
            });

            const rq1 = ImageSelectDialog.afterClosed().subscribe(response => {
              editor.insertContent(
                `<img src="${response.thumb_url}" alt="${response.alt}" width="${response.width}" height="${response.height}" />`
              );

              rq1.unsubscribe();
            });
          }
        });

        this.editor = editor;
      },
    });
  }

  addArticle(f: NgForm) {
    const categories = this.categories.filter(category => category.exist).map(category => category.id);

    const rq1 = this.articleRequestService.putArticle({
      title: f.value.title,
      sub_title: f.value.sub_title,
      body: tinymce.activeEditor.getContent(),
      keywords: this.keywords,
      published: f.value.published ? 1 : 0,
      language_id: f.value.language_id,
      slug: f.value.slug,
      category: categories,
      image: this.image_name
    }).subscribe(response => {

      if (f.value.forum_published && f.value.published) {
        const languageSlug = this.languages.find(language => language.id === f.value.language_id);
        const url = `${environment.discussUrl}?article=${f.value.slug}&language=${languageSlug.slug}#new_topic`;
        window.location.href = url;
      } else {
        this.helpersService.navigate(['/articles']);
      }
    });

    this.subs.add(rq1);
  }

  openImageSelect() {
    const dialogRef = this.dialog.open(ImageSelectComponent, {
      data: {
        image_request: this.articleRequestService.makeGetRequest('image.images'),
        thumb_image_url: this.articleRequestService.makeUrl('storage.images.thumbs')
      }
    });

    const rq2 = dialogRef.afterClosed().subscribe(response => {

      const el = document.getElementById('img');

      el.setAttribute('src', response.thumb_url);

      this.image_name = response.u_id;

      rq2.unsubscribe();
    });
  }

  addKeyword(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;
    // Add our keyword
    if ((value || '').trim()) {
      this.keywords.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  removeKeyword(keyword: any): void {
    const index = this.keywords.indexOf(keyword);

    if (index >= 0) {
      this.keywords.splice(index, 1);
    }
  }
}
