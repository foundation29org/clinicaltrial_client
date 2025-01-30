import * as $ from 'jquery';
import { NgModule, LOCALE_ID } from "@angular/core";
import { BrowserModule } from '@angular/platform-browser';
import es from '@angular/common/locales/es'
import fr from '@angular/common/locales/fr'
import de from '@angular/common/locales/de'
import it from '@angular/common/locales/it'
import pt from '@angular/common/locales/pt'
import { registerLocaleData } from '@angular/common';
registerLocaleData(es);
registerLocaleData(fr);
registerLocaleData(de);
registerLocaleData(it);
registerLocaleData(pt);
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { ToastrModule } from "ngx-toastr";
import { HTTP_INTERCEPTORS, HttpClientModule, HttpClient } from "@angular/common/http";
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { StoreModule } from "@ngrx/store";
import { DragulaService } from "ng2-dragula";
import { NgxSpinnerModule } from 'ngx-spinner';

import {
  PerfectScrollbarModule,
  PERFECT_SCROLLBAR_CONFIG,
  PerfectScrollbarConfigInterface
} from 'ngx-perfect-scrollbar';

import { AppRoutingModule } from "./app-routing.module";
import { SharedModule } from "./shared/shared.module";
import * as fromApp from './store/app.reducer';
import { AppComponent } from "./app.component";
import { LandPageLayoutComponent } from "./layouts/land-page/land-page-layout.component";

import { WINDOW_PROVIDERS } from './shared/services/window.service';
import { SortService } from 'app/shared/services/sort.service';
import { EventsService } from 'app/shared/services/events.service';
import { DatePipe } from '@angular/common';
import { DateService } from 'app/shared/services/date.service';
import { SearchService } from 'app/shared/services/search.service';
import { LocalizedDatePipe } from 'app/shared/services/localizedDatePipe.service';
import { HighlightSearch } from 'app/shared/services/search-filter-highlight.service';
import { SearchFilterPipe } from 'app/shared/services/search-filter.service';
import { Data } from 'app/shared/services/data.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';
import { AuthInterceptor } from './shared/auth/auth.interceptor';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true,
  wheelPropagation: false
};

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, "./assets/i18n/", ".json");
}

@NgModule({
  declarations: [AppComponent, LandPageLayoutComponent, SearchFilterPipe, HighlightSearch, LocalizedDatePipe],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    StoreModule.forRoot(fromApp.appReducer),
    AppRoutingModule,
    SharedModule,
    HttpClientModule,
    ToastrModule.forRoot(),
    NgbModule,
    NgxSpinnerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    PerfectScrollbarModule
  ],
  providers: [
    {
      provide : HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi   : true
    },
    DragulaService,
    {
      provide: PERFECT_SCROLLBAR_CONFIG,
      useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
    },
    { provide: PERFECT_SCROLLBAR_CONFIG, useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG },
    WINDOW_PROVIDERS,
    { provide: LOCALE_ID, useValue: 'es-ES' },
    SortService,
    EventsService,
    DatePipe,
    DateService,
    SearchService,
    InsightsService,
    HighlightSearch,
    LocalizedDatePipe,
    SearchFilterPipe,
    Data
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
