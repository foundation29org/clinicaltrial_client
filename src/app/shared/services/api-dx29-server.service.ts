import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { environment } from 'environments/environment';
import { catchError, map } from 'rxjs/operators'
import { InsightsService } from 'app/shared/services/azureInsights.service';

@Injectable()
export class ApiDx29ServerService {
    constructor(private http: HttpClient, public insightsService: InsightsService) {}

    getDetectLanguage(text) {
      var jsonText = [{ "text": text }];
      return this.http.post(environment.api + '/api/getDetectLanguage', jsonText).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }
    getOpenDetectLanguage(text, patientId, token) {
      var jsonText = [{ "text": text }];
      var body = { text: jsonText, token: token }
      return this.http.post(environment.api + '/api/getOpenDetectLanguage/'+patientId, body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getTranslationDictionary(lang, info) {
      var body = { lang: lang, info: info }
      return this.http.post(environment.api + '/api/translation', body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getOpenTranslationDictionary(lang, info, patientId, token) {
      var body = { lang: lang, info: info, token: token }
      return this.http.post(environment.api + '/api/opentranslation/'+patientId, body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getTranslationInvert(lang, info) {
      var body = { lang: lang, info: info }
      return this.http.post(environment.api + '/api/translationinvert', body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getOpenTranslationInvert(lang, info, patientId, token) {
      var body = { lang: lang, info: info, token: token }
      return this.http.post(environment.api + '/api/opentranslationinvert/'+patientId, body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getDeepLTranslationInvert(lang, info) {
      var body = { lang: lang, info: info }
      return this.http.post(environment.api + '/api/deepltranslationinvert', body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getDeepLTranslationInvertArray(lang, info) {
      var body = { lang: lang, info: info }
      return this.http.post(environment.api + '/api/translationinvertarray', body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getOpenDeepLTranslationInvert(lang, info, patientId, token) {
      var body = { lang: lang, info: info, token: token }
      return this.http.post(environment.api + '/api/deeplopentranslationinvert/'+patientId, body).pipe(
        map((res: any) => {
          return res;
        }),
        catchError((err) => {
          console.log(err);
          this.insightsService.trackException(err);
          return err;
        })
      );
    }

    getTranslationSegmentsInvert(originlang, lang,segments){
      var body = {originlang: originlang, lang:lang, segments: segments}
        return this.http.post(environment.api+'/api/translation/segments', body).pipe(
          map((res: any) => {
            return res;
          }),
          catchError((err) => {
            console.log(err);
            this.insightsService.trackException(err);
            return err;
          })
        );
      }

      getIATranslation(lang, text){
        var body = {lang:lang, text: text}
        return this.http.post(environment.api+'/api/translation/ia', body).pipe(
          map((res: any) => {
            return res;
          }),
          catchError((err) => {
            console.log(err);
            this.insightsService.trackException(err);
            return err;
          })
        );
      }

}
