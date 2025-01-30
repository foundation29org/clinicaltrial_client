import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter, map, mergeMap } from 'rxjs/operators';

import { Title, Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { LangService } from 'app/shared/services/lang.service';
import Swal from 'sweetalert2';
import { EventsService } from 'app/shared/services/events.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    providers: [LangService]
})
export class AppComponent implements OnInit, OnDestroy {

    private subscription: Subscription = new Subscription();
    actualPage: string = '';
    hasLocalLang: boolean = false;
    tituloEvent: string = '';

    constructor(public toastr: ToastrService, private router: Router, private activatedRoute: ActivatedRoute, private titleService: Title, public translate: TranslateService, private langService: LangService, private eventsService: EventsService, private meta: Meta, public insightsService: InsightsService) {
      if (localStorage.getItem('lang')) {
          this.translate.use(localStorage.getItem('lang'));
          this.hasLocalLang = true;
        } else {
          const browserLang: string = translate.getBrowserLang();
          this.translate.use(browserLang.match(/en|es|pt|de|fr|it/) ? browserLang : "en");
          localStorage.setItem('lang', this.translate.store.currentLang);
          this.hasLocalLang = false;
        }
    
        this.loadLanguages();
        this.loadCultures();        
    }

    loadLanguages() {
        this.langService.getLangs()
          .subscribe((res: any) => {
            if (!this.hasLocalLang) {
              const browserLang: string = this.translate.getBrowserLang();
              for (let lang of res) {
                if (browserLang.match(lang.code)) {
                  this.translate.use(lang.code);
                  localStorage.setItem('lang', lang.code);
                  this.eventsService.broadcast('changelang', lang.code);
                }
              }
            }
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
          })
      }
    
      loadCultures() {
        /*const browserCulture: string = this.translate.getBrowserCultureLang();
        localStorage.setItem('culture', browserCulture);*/
        if(localStorage.getItem('lang')=='es'){
          localStorage.setItem('culture', 'es-ES');
        }else if(localStorage.getItem('lang')=='de'){
          localStorage.setItem('culture', 'de-DE');
        }else if(localStorage.getItem('lang')=='fr'){
          localStorage.setItem('culture', 'fr-FR');
        }else if(localStorage.getItem('lang')=='it'){
          localStorage.setItem('culture', 'it-IT');
        }else if(localStorage.getItem('lang')=='pt'){
          localStorage.setItem('culture', 'pt-PT');
        }else{
          localStorage.setItem('culture', 'en-EN');
        }
        
        
      }


    ngOnInit() {

        this.meta.addTags([
            { name: 'keywords', content: this.translate.instant("seo.home.keywords") },
            { name: 'description', content: this.translate.instant("seo.home.description") },
            { name: 'title', content: this.translate.instant("seo.home.title") },
            { name: 'robots', content: 'index, follow' }
          ]);

        //evento que escucha si ha habido un error de conexión
    this.eventsService.on('http-error', function (error) {
        var msg1 = 'Connection lost';
        var msg2 = 'Trying to connect ...';
  
        if (localStorage.getItem('lang')) {
          var actuallang = localStorage.getItem('lang');
          if (actuallang == 'es') {
            msg1 = 'Se ha perdido la conexión';
            msg2 = 'Intentando conectar ...';
          } else if (actuallang == 'pt') {
            msg1 = 'Conexão perdida';
            msg2 = 'Tentando se conectar ...';
          } else if (actuallang == 'de') {
            msg1 = 'Verbindung unterbrochen';
            msg2 = 'Versucht zu verbinden ...';
          } else if (actuallang == 'fr') {
            msg1 = 'Connexion perdue';
            msg2 = 'Essayant de se connecter ...';
          }else if (actuallang == 'it') {
            msg1 = 'Collegamento perso';
            msg2 = 'Tentativo di connessione ...';
          }
        }
        if (error.message) {
          if (error == 'The user does not exist') {
            Swal.fire({
              icon: 'warning',
              title: this.translate.instant("errors.The user does not exist"),
              html: this.translate.instant("errors.The session has been closed")
            })
          }
        } else {
  
          Swal.fire({
            title: msg1,
            text: msg2,
            icon: 'warning',
            showCancelButton: false,
            confirmButtonColor: '#2F8BE6',
            confirmButtonText: 'OK',
            showLoaderOnConfirm: true,
            allowOutsideClick: false,
            reverseButtons: true
          }).then((result) => {
            if (result.value) {
              location.reload();
            }
  
          });
        }
      }.bind(this));


      this.subscription = this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.data)
      ).subscribe((event) => {
        (async () => {
          await this.delay(500);
          this.tituloEvent = event['title'];
          var titulo = this.translate.instant(this.tituloEvent);
          this.titleService.setTitle(titulo);
          //this.changeMeta();
      
        })();
      
        //para los anchor de la misma páginano hacer scroll hasta arriba
        if (this.actualPage != event['title']) {
          window.scrollTo(0, 0)
        }
        this.actualPage = event['title'];
      });
        
        this.eventsService.on('changelang', function (lang) {
            (async () => {
              if(this.tituloEvent){
                await this.delay(500);
                var titulo = this.translate.instant(this.tituloEvent);
                this.titleService.setTitle(titulo);
              }
                localStorage.setItem('lang', lang);
                this.changeMeta();
                this.loadCultures();
            })();
        }.bind(this));
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.eventsService.destroy();
    }

    changeMeta() {
        this.meta.updateTag({ name: 'keywords', content: this.translate.instant("seo.home.keywords") });
        this.meta.updateTag({ name: 'description', content: this.translate.instant("seo.home.description") });
        this.meta.updateTag({ name: 'title', content: this.translate.instant("seo.home.title") });
      }


}