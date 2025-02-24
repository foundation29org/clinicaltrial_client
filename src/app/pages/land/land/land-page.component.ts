import { Component, OnInit, OnDestroy, ViewChild, ElementRef, TemplateRef, NgZone, ChangeDetectorRef  } from '@angular/core';
import { trigger, transition, animate } from '@angular/animations';
import { style } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { LangService } from 'app/shared/services/lang.service';
import { EventsService } from 'app/shared/services/events.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';
import Swal from 'sweetalert2';
import { environment } from 'environments/environment';
import { Clipboard } from "@angular/cdk/clipboard"
import { jsPDFService } from 'app/shared/services/jsPDF.service'
import { jsPDF } from "jspdf";
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
declare var webkitSpeechRecognition: any;
import * as datos from './icons.json';
declare let html2canvas: any;

@Component({
  selector: 'app-land',
  templateUrl: './land-page.component.html',
  styleUrls: ['./land-page.component.scss'],
  providers: [ApiDx29ServerService, jsPDFService, LangService],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }), 
        animate('1s ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('0.5s ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('testani', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }), 
        animate('1s ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('0.5s ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class LandPageComponent implements OnInit, OnDestroy  {
  private subscription: Subscription = new Subscription();  loadedDocs: boolean = false;
  step: number = 1;
  docs: any = [];
  screenWidth: number;
  dataFile: any = {};
  lang: string = 'en';
  originalLang: string = 'en';
  messages = [];
  message = '';
  callingOpenai: boolean = false;
  actualStatus: string = '';
  messagesExpect: string = '';
  messagesExpectOutPut: string = '';
  private intervalId: any;
  valueProm: any = {};
  tempInput: string = '';
  detectedLang: string = 'en';
  extractedEvents: {
    conditions: Array<{text: string, selected: boolean, editing?: boolean}>;
    treatments: Array<{text: string, selected: boolean, editing?: boolean}>;
    otherTerms: Array<{text: string, selected: boolean, editing?: boolean}>;
  } = {
    conditions: [],
    treatments: [],
    otherTerms: []
  };
  showEventsPanel: boolean = false; //////////////////////////////
  intent: string = '';
  context = [];
  conversation = [];
  submitted: boolean = false;
  @ViewChild('contentSummaryDoc', { static: false }) contentSummaryDoc: TemplateRef<any>;
  modalReference: NgbModalRef;
  actualDoc: any = {};
  totalTokens = 0;
  readonly TOKENS_LIMIT: number = 100000;
  modegod: boolean = false;
  countModeGod: number = 0;
  callingSummary: boolean = false;
  summaryPatient: string = '';
  translatedText: string = '';
  selectedLanguage: any = {code:"en",name:"English",nativeName:"English"};
  callingTranslate: boolean = false;
  stepDisclaimer: number = 1;
  myuuid: string = uuidv4();
  paramForm: string = null;
  actualRole: string = '';
  medicalText: string = '';
  summaryDx29: string = '';
  summaryTranscript2: string = '';
  mode: string = '1';
  submode: string = 'opt1';
  recognition: any;
  recording = false;
  supported = false;
  timer: number = 0;
  timerDisplay: string = '00:00';
  private interval: any;
  private audioIntro = new Audio('assets/audio/sonido1.mp4');
  private audioOutro = new Audio('assets/audio/sonido2.mp4');
  stepPhoto = 1;
  capturedImage: any;
  icons: any = (datos as any).default;
  timeline: any = [];
  groupedEvents: any = [];

  startDate: Date;
  endDate: Date;
  selectedEventType: string = null;
  originalEvents: any[]; // Todos los eventos antes de aplicar el filtro
  filteredEvents: any[];
  isOldestFirst = false;
  showFilters = false;
  allLangs: any;

  isEditable = false;
  originalContent: string;
  editedContent: string;
  initialized = false;
  @ViewChild('showPanelEdit') showPanelEdit: TemplateRef<any>;
  @ViewChild('editableDiv') editableDiv: ElementRef;

  clinicalTrials: any[] = []; // para que la variable sea legible para el ngIf
  selectedTrial: any = {}; // para guardar el trial seleccionado en el modal

  statusColors = {
    'NOT_YET_RECRUITING': '#BCEBCB', // Verde flojo
    'AVAILABLE': '#BCEBCB', // Verde flojo
    'RECRUITING': '#BCEBCB',         // Verde flojo
    'ENROLLING_BY_INVITATION': '#ffde7b', // Naranja warning cálido
    'ACTIVE_NOT_RECRUITING': '#ffde7b', // Naranja warning cálido
    'TERMINATED': '#ffa1a2', // Rojo ligero
    'SUSPENDED': '#ffa1a2', // Rojo ligero
    'WITHDRAWN': '#ffa1a2', // Rojo ligero
    'COMPLETED': '#ffa1a2',          // Rojo ligero
    'UNKNOWN' : '#c0c6cf',            // Gris claro
  };

  statusOptions = [
    { label: 'Not yet recruiting', value: 'NOT_YET_RECRUITING' },
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Recruiting', value: 'RECRUITING' },
    { label: 'Enrolling by invitation', value: 'ENROLLING_BY_INVITATION' },
    { label: 'Active, not recruiting', value: 'ACTIVE_NOT_RECRUITING' },
    { label: 'Terminated', value: 'TERMINATED' },
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Withdrawn', value: 'WITHDRAWN' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Unknown', value: 'UNKNOWN' },
  ];

  filters = {
    status: ['NOT_YET_RECRUITING', 'AVAILABLE', 'RECRUITING', 'ENROLLING_BY_INVITATION', 'ACTIVE_NOT_RECRUITING', 'TERMINATED', 'SUSPENDED', 'WITHDRAWN', 'COMPLETED', 'UNKNOWN'], // Default selected statuses
    condition: '',
    countries: [] // Add countries filter
  };

  getStatusCount(status: string): number {
    if (!this.clinicalTrials) return 0;
    return this.clinicalTrials.filter(trial => 
      trial.OverallStatus === status
    ).length;
  }

  getCountryCount(country: string): number {
    if (!this.clinicalTrials) return 0;
    return this.clinicalTrials.filter(trial => 
      trial.Locations && trial.Locations.some(location => 
        location.country === country
      )
    ).length;
  }

  getUniqueLocations(locations: any[]): any[] {
    if (!locations) return [];
    
    const uniqueLocations = locations.reduce((acc, location) => {
      const locationKey = `${location.facility}-${location.city}-${location.country}`;
      if (!acc.some(l => `${l.facility}-${l.city}-${l.country}` === locationKey)) {
        acc.push(location);
      }
      return acc;
    }, []);
  
    return uniqueLocations;
  }
  
  get filteredTrials(): any[] {
    if (!this.clinicalTrials) {
      return [];
    }
    return this.clinicalTrials.filter(trial => {
      // Filtro por estado del ensayo (OverallStatus)
      const matchStatus = this.filters.status.length === 0 
                          || this.filters.status.includes(trial.OverallStatus);

      // Filtro por Condition (búsqueda parcial, ignorando mayúsculas)
      const matchCondition = !this.filters.condition 
        || (trial.Condition && trial.Condition.toLowerCase()
                                   .includes(this.filters.condition.toLowerCase()));

      // Filtro por país
      const matchCountry = this.filters.countries.length === 0 ||
        (trial.Locations && trial.Locations.some(location => 
          this.filters.countries.includes(location.country)
        ));

      return matchStatus && matchCondition && matchCountry;
    });
  }

  clearFilters(): void {
    this.filters.status = [
      'RECRUITING', 
      'NOT_YET_RECRUITING', 
      'COMPLETED', 
      'UNKNOWN', 
      'ACTIVE', 
      'SUSPENDED', 
      'TERMINATED', 
      'WITHDRAWN', 
      'AVAILABLE', 
      'APPROVED'
    ]; // Reset to default selected statuses
    this.filters.condition = '';
    this.filters.countries = []; // Clear countries filter
  }

  toggleStatus(value: string): void {
    const index = this.filters.status.indexOf(value);
    if (index === -1) {
      this.filters.status.push(value);
    } else {
      this.filters.status.splice(index, 1);
    }
  }

  toggleCountry(country: string): void {
    const index = this.filters.countries.indexOf(country);
    if (index === -1) {
      this.filters.countries.push(country);
    } else {
      this.filters.countries.splice(index, 1);
    }
  }

  getUniqueCountries(): string[] {
    if (!this.clinicalTrials) return [];
    
    const countries = new Set<string>();
    this.clinicalTrials.forEach(trial => {
      if (trial.Locations) {
        trial.Locations.forEach(location => {
          if (location.country) {
            countries.add(location.country);
          }
        });
      }
    });
    
    return Array.from(countries).sort();
  }

  langDict = {
    "af": null,
    "sq": null,
    "am": null,
    "ar": null,
    "hy": null,
    "as": null,
    "az": null,
    "bn": null,
    "ba": null,
    "eu": null,
    "bs": null,
    "bg": "BG",
    "yue": null,
    "ca": null,
    "lzh": null,
    "zh-Hans": "ZH",
    "zh-Hant": "ZH",
    "hr": null,
    "cs": "CS",
    "da": "DA",
    "prs": null,
    "dv": null,
    "nl": "NL",
    "en": "EN-US",
    "et": "ET",
    "fo": null,
    "fj": null,
    "fil": null,
    "fi": "FI",
    "fr": "FR",
    "fr-ca": null,
    "gl": null,
    "ka": null,
    "de": "DE",
    "el": "EL",
    "gu": null,
    "ht": null,
    "he": null,
    "hi": null,
    "mww": null,
    "hu": "HU",
    "is": null,
    "id": "ID",
    "ikt": null,
    "iu": null,
    "iu-Latn": null,
    "ga": null,
    "it": "IT",
    "ja": "JA",
    "kn": null,
    "kk": null,
    "km": null,
    "tlh-Latn": null,
    "tlh-Piqd": null,
    "ko": "KO",
    "ku": null,
    "kmr": null,
    "ky": null,
    "lo": null,
    "lv": "LV",
    "lt": "LT",
    "mk": null,
    "mg": null,
    "ms": null,
    "ml": null,
    "mt": null,
    "mi": null,
    "mr": null,
    "mn-Cyrl": null,
    "mn-Mong": null,
    "my": null,
    "ne": null,
    "nb": "NB",
    "or": null,
    "ps": null,
    "fa": null,
    "pl": "PL",
    "pt": "pt-PT",
    "pt-pt": null,
    "pa": null,
    "otq": null,
    "ro": "RO",
    "ru": "RU",
    "sm": null,
    "sr-Cyrl": null,
    "sr-Latn": null,
    "sk": "SK",
    "sl": "SL",
    "so": null,
    "es": "ES",
    "sw": null,
    "sv": "SV",
    "ty": null,
    "ta": null,
    "tt": null,
    "te": null,
    "th": null,
    "bo": null,
    "ti": null,
    "to": null,
    "tr": "TR",
    "tk": null,
    "uk": "UK",
    "hsb": null,
    "ur": null,
    "ug": null,
    "uz": null,
    "vi": null,
    "cy": null,
    "yua": null,
    "zu": null
};


  constructor(private http: HttpClient, public translate: TranslateService, public toastr: ToastrService, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private eventsService: EventsService, public insightsService: InsightsService, private clipboard: Clipboard, public jsPDFService: jsPDFService, private ngZone: NgZone, private cdr: ChangeDetectorRef, private langService: LangService) {
    this.screenWidth = window.innerWidth;
    if(sessionStorage.getItem('lang') == null){
      sessionStorage.setItem('lang', this.translate.store.currentLang);
    }
    this.lang = this.translate.store.currentLang;
    this.originalLang = this.translate.store.currentLang;
  }

  async ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.modalService) {
      this.modalService.dismissAll();
    }
  }

  openTrialInfo(trial: any, contentTrial: any) {
    console.log('Trial object structure:', JSON.stringify(trial, null, 2));
    this.selectedTrial = trial;
    const options: NgbModalOptions = {
      backdrop: 'static',
      keyboard: false,
      windowClass: 'trial-info-modal'
    };
    this.modalReference = this.modalService.open(contentTrial, options);
  }

  closeModalTrial() { // cierra el modal de trial
    if (this.modalReference) {
      this.modalReference.close();
    }
  }

  async ngOnInit() {

    this.showDisclaimer();

    this.loadedDocs = true;
    if (this.docs.length == 0) {
      this.step = 1;
    } else {
      this.step = 2;
    }

    this.eventsService.on('changelang', function (lang) {
      (async () => {
        this.lang = lang;
        this.originalLang = lang;
        this.setupRecognition();
      })();
    }.bind(this));

    
    /*this.timeline= [
      {
        "date": "2014-02-23",
        "eventType": "diagnosis",
        "keyGeneticEvent": "Status convulsivo"
      },
      {
        "date": "2014-03-01",
        "eventType": "diagnosis",
        "keyGeneticEvent": "Status convulsivo"
      },
      {
        "date": "2015-05-01",
        "eventType": "diagnosis",
        "keyGeneticEvent": "Status convulsivo"
      },
      {
        "date": "2023-03-10",
        "eventType": "test",
        "keyGeneticEvent": "Analítica de sangre"
      },
      {
        "date": "2023-03-10",
        "eventType": "treatment",
        "keyGeneticEvent": "Inicio de tratamiento con Diacomit, Depakine, Noiafren, Fenfluramina y Ferrosol"
      }
    ];
    this.originalEvents = this.timeline;
    this.filterEvents();*/
  }

 

  showDisclaimer() {
    console.log(localStorage.getItem('hideDisclaimerlite'))
    if (localStorage.getItem('hideDisclaimerlite') == null || !localStorage.getItem('hideDisclaimerlite')) {
        this.stepDisclaimer = 1;
        document.getElementById("openModalIntro").click();
    }
  }

  showPolicy(){
    this.stepDisclaimer = 2;
    document.getElementById("openModalIntro").click();
    this.scrollTo();
  }

  async scrollTo() {
    await this.delay(200);
    document.getElementById('initcontentIntro').scrollIntoView({ behavior: "smooth" });
}

  showPanelIntro(content) {
    if (this.modalReference != undefined) {
        this.modalReference.close();
    }
    let ngbModalOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: false,
        windowClass: 'ModalClass-sm'
    };
    this.modalReference = this.modalService.open(content, ngbModalOptions);
}

nextDisclaimer() {
  this.stepDisclaimer++;
  if (this.stepDisclaimer > 2) {
      this.finishDisclaimer();
  }
}

scrollToFirstTrial() {
  const firstTrial = document.getElementById('first-trial');
  if (firstTrial) {
    const navbarHeight = 70; // Typical navbar height, adjust this value based on your actual navbar height
    const elementPosition = firstTrial.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

prevDisclaimer() {
  this.stepDisclaimer--;
}

finishDisclaimer() {
  if (this.modalReference != undefined) {
      this.modalReference.close();
  }
  localStorage.setItem('hideDisclaimerlite', 'true')
}

showForm() {
}


  selectOpt(opt){
    this.audioIntro.play().catch(error => console.error("Error al reproducir el audio:", error));
    this.mode = '1';
    this.submode= opt;
    this.medicalText = '';
    this.summaryDx29 = '';
    /*this.summaryPatient = '';
    this.conversation = [];
    this.context = [];
    this.messages = [];
    this.initChat();
    this.totalTokens = 0;
    this.modegod = false;
    this.countModeGod = 0;
    this.callingSummary = false;
    this.docs = [];
    this.recording = false;
    this.loadedDocs = false;
    this.step = 1;*/
    this.setupRecognition();
  }

  backmode0(): void {
    this.audioOutro.play().catch(error => console.error("Error al reproducir el audio:", error));
    this.mode = '1';
    this.submode = 'opt1';
    this.docs = [];
    this.summaryPatient = '';
    this.conversation = [];
    this.context = [];
    this.messages = [];
    this.initChat();
    this.totalTokens = 0;
    this.modegod = false;
    this.countModeGod = 0;
    this.callingSummary = false;
    this.medicalText = '';
    this.summaryDx29 = '';
    this.step = 1;
    this.originalContent = '';
    this.editedContent = '';
  }

  setupRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // El navegador soporta la funcionalidad
      console.log('soporta')
      this.recognition = new webkitSpeechRecognition();
      if(this.lang == 'en'){
        this.recognition.lang = 'en-US';
      }else if(this.lang == 'es'){
        this.recognition.lang = 'es-ES';
      }else if(this.lang == 'fr'){
        this.recognition.lang = 'fr-FR';
      }else if(this.lang == 'de'){
        this.recognition.lang = 'de-DE';
      }else if(this.lang == 'it'){
        this.recognition.lang = 'it-IT';
      }else if(this.lang == 'pt'){
        this.recognition.lang = 'pt-PT';
      }
      this.recognition.continuous = true;
      this.recognition.maxAlternatives = 3;
      this.supported = true;
    } else {
      // El navegador no soporta la funcionalidad
      this.supported = false;
      console.log('no soporta')
    }
  }


  startTimer(restartClock) {
    if(restartClock){
      this.timer = 0;
      this.timerDisplay = '00:00';
    }
    this.interval = setInterval(() => {
      this.timer++;
      this.timerDisplay = this.secondsToDisplay(this.timer);
    }, 1000);
  }
  
  stopTimer() {
    clearInterval(this.interval);
    this.timerDisplay = this.secondsToDisplay(this.timer);
  }
  
  secondsToDisplay(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  toggleRecording() {
    if (this.recording) {
      //mosstrar el swal durante dos segundos diciendo que es está procesando
      Swal.fire({
        title: this.translate.instant("voice.Processing audio..."),
        html: this.translate.instant("voice.Please wait a few seconds."),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
      })
      //esperar 4 segundos
      console.log('esperando 4 segundos')
      setTimeout(function () {
        console.log('cerrando swal')
        this.stopTimer();
        this.recognition.stop();
        Swal.close();
      }.bind(this), 4000);
      
      this.recording = !this.recording;
      
    } else {
      if(this.medicalText.length > 0){
        //quiere continuar con la grabacion o empezar una nueva
        Swal.fire({
          title: this.translate.instant("voice.Do you want to continue recording?"),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#0CC27E',
          cancelButtonColor: '#FF586B',
          confirmButtonText: this.translate.instant("voice.Yes, I want to continue."),
          cancelButtonText: this.translate.instant("voice.No, I want to start a new recording."),
          showLoaderOnConfirm: true,
          allowOutsideClick: false
        }).then((result) => {
          if (result.value) {
            this.continueRecording(false, true);
          }else{
            this.medicalText = '';
            this.continueRecording(true, true);
          }
        });
      }else{
        this.continueRecording(true, true);
      }
    }
    
  }

  continueRecording(restartClock, changeState){
    this.startTimer(restartClock);
    this.recognition.start();
    this.recognition.onresult = (event) => {
      console.log(event)
      var transcript = event.results[event.resultIndex][0].transcript;
      console.log(transcript); // Utilizar el texto aquí
      //this.medicalText += transcript + '\n';
      this.ngZone.run(() => {
        this.medicalText += transcript + '\n';
      });
      if (event.results[event.resultIndex].isFinal) {
        console.log('ha terminado')
      }
    };

   // this.recognition.onerror = function(event) {
    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        console.log('Reiniciando el reconocimiento de voz...');
        this.restartRecognition(); // Llama a una función para reiniciar el reconocimiento
      } else {
        // Para otros tipos de errores, muestra un mensaje de error
        this.toastr.error('', this.translate.instant("voice.Error in voice recognition."));
      }
    };
    if(changeState){
      this.recording = !this.recording;
    }
  }

  restartRecognition() {
    this.recognition.stop(); // Detiene el reconocimiento actual
    setTimeout(() => this.continueRecording(false, false), 100); // Un breve retraso antes de reiniciar
  }

  restartTranscript(){
    this.medicalText = '';
    this.summaryDx29 = '';
  }

  isSmallScreen(): boolean {
    return this.screenWidth < 576; // Bootstrap's breakpoint for small screen
  }

  onFileDropped(event) {
    // Limpiar el array de documentos antes de agregar uno nuevo
    this.docs = [];
    for (let file of event) {
      var reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = (event2: any) => {
        var filename = (file).name;
        var extension = filename.substr(filename.lastIndexOf('.'));
        var pos = (filename).lastIndexOf('.')
        pos = pos - 4;
        if (pos > 0 && extension == '.gz') {
          extension = (filename).substr(pos);
        }
        filename = filename.split(extension)[0];
          filename = this.myuuid + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename, content: event2.target.result }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
        if (file.type == 'application/pdf' || extension == '.docx' || file.type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension == '.jpg' || extension == '.png' || extension == '.jpeg' || extension == '.bmp' || extension == '.tiff' || extension == '.heif' || extension == '.pptx') {
          let index = this.docs.length - 1;
          //this.callParser(index);
          this.prepareFile(index);
        } else {
          Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
        }
      }
    }
  }

  onFileChangePDF(event) {
    this.docs = [];
    for (let file of event.target.files) {
      if (event.target.files && file) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(file); // read file as data url
        reader.onload = (event2: any) => { // called once readAsDataURL is completed
          var filename = (file).name;
          var extension = filename.substr(filename.lastIndexOf('.'));
          var pos = (filename).lastIndexOf('.')
          pos = pos - 4;
          if (pos > 0 && extension == '.gz') {
            extension = (filename).substr(pos);
          }
          filename = filename.split(extension)[0];
          filename = this.myuuid + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename, content: event2.target.result }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
          if (event.target.files[0].type == 'application/pdf' || extension == '.docx' || event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension == '.jpg' || extension == '.png' || extension == '.jpeg' || extension == '.bmp' || extension == '.tiff' || extension == '.heif' || extension == '.pptx') {
            let index = this.docs.length - 1;
            this.prepareFile(index);
          } else {
            Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
          }
        }
      }
    }
  }

  makeid(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += Math.floor(Math.random() * charactersLength);
    }
    return result;
  }

  prepareFile(index) {
    this.docs[index].state = 'uploading';
    const formData = new FormData();
    formData.append("userId", this.myuuid);
    formData.append("thumbnail", this.docs[index].dataFile.event);
    formData.append("url", this.docs[index].dataFile.url);
    formData.append("docId", index);
    this.sendFile(formData, index);
  }

  sendFile(formData, index) {
    this.submitted = true;
    this.subscription.add(
      this.http.post(environment.api + '/api/extractEventsFromFile', formData, { observe: 'response' })
        .subscribe({
          next: (response: HttpResponse<any>) => {
            if (response.status !== 200) {
              this.docs[index].state = 'failed';
            } else {
              const resBody = response.body;
              this.docs[index].state = 'done';
              this.docs[index].medicalText = resBody.data;
              this.docs[index].summary = resBody.summary;
              this.docs[index].tokens = resBody.tokens;
              this.totalTokens += resBody.tokens;

              // Actualizar extractedEvents con los eventos del archivo
              if (resBody.events) {
                this.extractedEvents = {
                  conditions: resBody.events.conditions?.map((c, index) => ({ text: c, selected: index === 0 })) || [],
                  treatments: resBody.events.treatments?.map(t => ({ text: t, selected: false })) || [],
                  otherTerms: resBody.events.otherTerms?.map(t => ({ text: t, selected: false })) || []
                };
                // Mostrar el panel de eventos si hay eventos extraídos
                if (this.extractedEvents.conditions.length > 0 || 
                    this.extractedEvents.treatments.length > 0 || 
                    this.extractedEvents.otherTerms.length > 0) {
                  this.showEventsPanel = true;
                  this.searchTrials();
                }
              }
              
              this.submitted = false;
            }
          },
          error: (err) => {
            this.docs[index].state = 'failed';
            console.error(err);
            this.insightsService.trackException(err);
            this.submitted = false;

            let msgFail = this.translate.instant("generics.Data saved fail");
            if (err?.error?.message) {
              this.toastr.error(err.error.message, msgFail);
            } else {
              this.toastr.error('', msgFail);
            }
          }
        })
    );
  }

  searchTrials() {
    // Get all selected events
    const selectedEvents = {
      conditions: this.extractedEvents.conditions?.filter(c => c.selected).map(c => c.text) || [],
      treatments: this.extractedEvents.treatments?.filter(t => t.selected).map(t => t.text) || [],
      otherTerms: this.extractedEvents.otherTerms?.filter(t => t.selected).map(t => t.text) || []
    };

    // Crear payload JSON
    const payload = {
      userId: this.myuuid,
      events: selectedEvents
    };

    console.log(payload);

    // Call the trial matcher API
    this.submitted = true;
    this.clinicalTrials = []; // Clear previous results
    
    this.subscription.add(
      this.http.post(environment.api + '/api/searchTrials', payload, { observe: 'response' })
        .subscribe({
          next: (response: HttpResponse<any>) => {
            if (response.status !== 200) {
              this.toastr.error(this.translate.instant("generics.Data saved fail"));
            } else {
              if (response.body.clinicalTrials?.length > 0) {
                this.clinicalTrials = response.body.clinicalTrials.map(trial => ({
                  ...trial,
                  showCriteria: false,
                  isLoadingCriteria: false,
                  structuredCriteria: null
                }));
              }
              console.log(this.clinicalTrials);
            }
            this.submitted = false;
          },
          error: (err) => {
            console.error('Error searching trials:', err);
            this.insightsService.trackException(err);
            this.submitted = false;

            let msgFail = this.translate.instant("generics.Data saved fail");
            if (err?.error?.message) {
              this.toastr.error(err.error.message, msgFail);
            } else {
              this.toastr.error('', msgFail);
            }
          }
        })
    );
  }


  sendFile_prev(formData, index) { // also receives the list of trials
    this.submitted = true;
    this.clinicalTrials = []; // we clear the array from previous searches
    this.subscription.add(
      this.http.post(environment.api + '/api/callTrialMatcher', formData, { observe: 'response' })
        .subscribe({
          next: (response: HttpResponse<any>) => {
            console.log(response.body);
            if (response.body.clinicalTrials?.length > 0) {
              // Mapear los ensayos clínicos y agregar las propiedades necesarias
              this.clinicalTrials = response.body.clinicalTrials.map(trial => ({
                ...trial,
                showCriteria: false,
                isLoadingCriteria: false,
                structuredCriteria: null
              }));
            }

            if (response.status !== 200) {
              this.docs[index].state = 'failed';
            } else {
              const resBody = response.body;
              this.docs[index].state = 'done';
              this.docs[index].medicalText = resBody.data;
              this.docs[index].summary = resBody.summary;
              this.docs[index].tokens = resBody.tokens;
              this.totalTokens += resBody.tokens;
              this.submitted = false;
            }
          },
          error: (err) => {
            this.docs[index].state = 'failed';
            console.error(err);
            this.insightsService.trackException(err);
            this.submitted = false;

            let msgFail = this.translate.instant("generics.Data saved fail");
            if (err?.error?.message) {
              this.toastr.error(err.error.message, msgFail);
            } else {
              this.toastr.error('', msgFail);
            }
          }
        })
    );
  } // sdfg

  deleteDoc(doc, index) {
    Swal.fire({
      title: this.translate.instant("generics.Are you sure?"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0CC27E',
      cancelButtonColor: '#FF586B',
      confirmButtonText: this.translate.instant("generics.Delete"),
      cancelButtonText: this.translate.instant("generics.No, cancel"),
      showLoaderOnConfirm: true,
      allowOutsideClick: false
    }).then((result) => {
      if (result.value) {
        this.confirmDeleteDoc(doc, index);
      }
    });
  }

  confirmDeleteDoc(doc, index) {
    this.totalTokens = this.totalTokens - doc.tokens;
    this.docs.splice(index, 1);
  }

  sendMessage() {
    if (!this.message) {
      return;
    }
    if(this.totalTokens > this.TOKENS_LIMIT){
      this.toastr.error('', this.translate.instant("demo.Tokens limit exceeded"));
      return;
    }

    this.messages.push({
      text: this.message,
      isUser: true
    });
    this.detectIntent();
  }

  detectIntent() {
    this.callingOpenai = true;
    this.actualStatus = 'procesando intent';
    this.statusChange();
    var promIntent = this.translate.instant("promts.0", {
      value: this.message,
    });
    this.valueProm = { value: promIntent };
    this.tempInput = this.message;
    var testLangText = this.message
    if (testLangText.length > 0) {
      this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {
            this.detectedLang = res[0].language;
            var info = [{ "Text": this.message }]
            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
              .subscribe((res2: any) => {
                var textToTA = this.message;
                if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                    textToTA = res2[0].translations[0].text;
                    this.tempInput = res2[0].translations[0].text;
                  }
                }
                promIntent = this.translate.instant("promts.0", {
                  value: textToTA,
                });
                this.valueProm = { value: promIntent };
                this.continueSendIntent(textToTA);
              }, (err) => {
                console.log(err);
                this.insightsService.trackException(err);
                this.continueSendIntent(this.message);
              }));
          } else {
            this.detectedLang = 'en';
            this.continueSendIntent(this.message);
          }

        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }));
    } else {
      this.continueSendIntent(this.message);
    }
  }

  private statusChange() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.messagesExpectOutPut = '';

    this.messagesExpect = this.translate.instant(`messages.${this.actualStatus}`);
    this.delay(100);
    const words = this.messagesExpect.split(' ');
    let index = 0;

    this.intervalId = setInterval(() => {
      if (index < words.length && this.callingOpenai) {
        const word = words[index];
        this.messagesExpectOutPut += (index > 0 ? ' ' : '') + word;
        index++;
      } else {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, 20);
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  continueSendIntent(msg) {
    this.context = [];
    for (let doc of this.docs) {
      this.context.push(doc.medicalText);
    }
    var query = { "question": msg, "conversation": this.conversation, "userId": this.myuuid, "context": this.context };
    console.log(query)
    this.subscription.add(this.http.post(environment.api + '/api/callnavigator/', query)
      .subscribe(async (res: any) => {
        if(res.response != undefined){
          this.conversation.push({ role: "user", content: this.message });
          this.conversation.push({ role: "assistant", content: res.response });
          this.message = '';
          this.translateInverse(res.response).catch(error => {
            console.error('Error al procesar el mensaje:', error);
            this.insightsService.trackException(error);
          });
        }else{
          this.callingOpenai = false;
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }
        

      }, (err) => {
        this.callingOpenai = false;
        console.log(err);
        this.insightsService.trackException(err);
        //this.message = '';
        this.messages.push({
          text: '<strong>' + this.translate.instant("generics.error try again") + '</strong>',
          isUser: false
        });
      }));
  }

  async translateInverse(msg): Promise<string> {
    return new Promise((resolve, reject) => {
  
      // Función auxiliar para procesar el contenido de la tabla
      const processTable = (tableContent) => {
        // Dentro de las tablas, mantenemos los saltos de línea intactos
        return tableContent;
      };
  
      // Función auxiliar para procesar el texto fuera de las tablas
      const processNonTableContent = (text) => {
        // Fuera de las tablas, convertimos los saltos de línea en <br>
        return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
      };
  
      if (this.detectedLang != 'en') {
        var jsontestLangText = [{ "Text": msg }];
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
          .subscribe((res2: any) => {
            if (res2.text != undefined) {
              msg = res2.text;
            }
  
            // Dividimos el mensaje en partes de tabla y no tabla
            const parts = msg.split(/(<table>|<\/table>)/);
  
            // Procesamos las secciones y reconstruimos el mensaje final
            msg = parts.map((part, index) => {
              // Solo procesamos el texto fuera de las etiquetas de la tabla
              if (part === '<table>' || part === '</table>') {
                return part;
              }
              return index % 4 === 2 ? processTable(part) : processNonTableContent(part);
            }).join('');
  
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok');
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            msg = processNonTableContent(msg);
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok');
          }));
      } else {
        msg = processNonTableContent(msg);
        this.messages.push({
          text: msg,
          isUser: false
        });
        this.callingOpenai = false;
        resolve('ok');
      }
    });
  }
  
  async translateInverse2(msg): Promise<string> {
    return new Promise((resolve, reject) => {

      if (this.detectedLang != 'en') {
        var jsontestLangText = [{ "Text": msg }]
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
          .subscribe((res2: any) => {
            if (res2.text != undefined) {
              msg = res2.text;
            }
            msg = msg.replace(/\\n\\n/g, '<br>');
            msg = msg.replace(/\n/g, '<br>');
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            msg = msg.replace(/\\n\\n/g, '<br>');
            msg = msg.replace(/\n/g, '<br>');
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }));
      } else {
        msg = msg.replace(/\\n\\n/g, '<br>');
        msg = msg.replace(/\n/g, '<br>');
        this.messages.push({
          text: msg,
          isUser: false
        });
        this.callingOpenai = false;
        resolve('ok')
      }
    });
  }

  copymsg(msg){
    this.clipboard.copy(msg.text);
    Swal.fire({
        icon: 'success',
        html: this.translate.instant("messages.Results copied to the clipboard"),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
    })
    setTimeout(function () {
        Swal.close();
    }, 2000);
}

getBlobUrl(doc){
  let url = URL.createObjectURL(doc.dataFile.event);
  window.open(url);
}

openResults(doc, contentSummaryDoc) {
  console.log(doc)
  this.actualDoc=doc;
  let ngbModalOptions: NgbModalOptions = {
    keyboard: false,
    windowClass: 'ModalClass-sm' // xl, lg, sm
  };
  if (this.modalReference != undefined) {
    this.modalReference.close();
    this.modalReference = undefined;
  }
  this.modalReference = this.modalService.open(contentSummaryDoc, ngbModalOptions);
}

openFileInput(fileInput: any): void {
  fileInput.click();
}

async closeModal() {

  if (this.modalReference != undefined) {
    this.modalReference.close();
    this.modalReference = undefined;
  }
}

copyConversationToClipboard() {
  let conversationText = '';
  let me = this.translate.instant("generics.Me")
  for (let message of this.messages) {
    console.log(message)
    conversationText += message.isUser ? me+`: ${message.text}\n` : `Nav29: ${message.text}\n`;
  }
  navigator.clipboard.writeText(conversationText).then(() => {
    alert('Conversación copiada al portapapeles.');
  });
}

showModeGod(){
  this.countModeGod++;
  if(this.countModeGod == 5){
    this.modegod = true;
    this.toastr.success('', 'Mode God activated');
  }
}

madeSummary(role){
  this.timeline = [];
  this.originalEvents = [];
  this.groupedEvents = [];
  this.context = [];
  let nameFiles = [];
    for (let doc of this.docs) {
      if(doc.state == 'done'){
        if(doc.summary){
          this.context.push(doc.summary);
        }else{
          this.context.push(doc.medicalText);
        }

        
        nameFiles.push(doc.dataFile.name);
      }
      if(doc.state == 'uploading'){
        this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
        return;
      }
    }
    
  this.actualRole = role;
  this.callingSummary = true;
  this.summaryPatient = '';

    if(this.context.length == 0){
      this.callingSummary = false;
      this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
      return;
    }
    this.paramForm = this.myuuid+'/results/'+this.makeid(8)
    var query = { "userId": this.myuuid, "context": this.context, "conversation": this.conversation, "role": role, nameFiles: nameFiles, paramForm: this.paramForm };
    this.subscription.add(this.http.post(environment.api + '/api/callsummary/', query)
      .subscribe(async (res: any) => {
        if(res.result1 != undefined){
          res.result1 = res.result1.replace(/^```html\n|\n```$/g, '');
          //res.response = res.response.replace(/\\n\\n/g, '<br>');
          //res.response = res.response.replace(/\n/g, '<br>');
          res.result1 = res.result1.replace(/\\n\\n/g, '');
          res.result1 = res.result1.replace(/\n/g, '');
          this.translateInverseSummary(res.result1).catch(error => {
            console.error('Error al procesar el mensaje:', error);
            this.insightsService.trackException(error);
          });
        }else{
          this.callingSummary = false;
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }
        if(res.result2 != undefined){
          if(res.result2.length > 0){
            this.timeline = JSON.parse(res.result2);
            //this.groupedEvents = this.groupEventsByMonth(this.timeline);
            this.originalEvents = this.timeline;
            this.filterEvents();
          }          
        }
        

      }, (err) => {
        this.callingSummary = false;
        console.log(err);
        this.insightsService.trackException(err);
      }));
}

private groupEventsByMonth(events: any[]): any[] {
  const grouped = {};

  events.forEach(event => {
    const monthYear = this.getMonthYear(event.date).getTime(); // Usar getTime para agrupar
    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }
    grouped[monthYear].push(event);
  });

  return Object.keys(grouped).map(key => ({
    monthYear: new Date(Number(key)), // Convertir la clave de nuevo a fecha
    events: grouped[key]
  }));
}


private getMonthYear(dateStr: string): Date {
  const date = new Date(dateStr);
  return new Date(date.getFullYear(), date.getMonth(), 1); // Primer día del mes
}


filterEvents() {
  this.cdr.detectChanges();
  console.log(this.originalEvents);
  console.log(this.startDate);
  console.log(this.endDate);

  const startDate = this.startDate ? new Date(this.startDate) : null;
  const endDate = this.endDate ? new Date(this.endDate) : null;

  const filtered = this.originalEvents.filter(event => {
    const eventDate = new Date(event.date);

    const isAfterStartDate = !startDate || eventDate >= startDate;
    const isBeforeEndDate = !endDate || eventDate <= endDate;
    console.log(this.selectedEventType)
    const isEventTypeMatch = !this.selectedEventType || this.selectedEventType=='null' || !event.eventType || event.eventType === this.selectedEventType;
    //const isEventTypeMatch = !this.selectedEventType || event.keyGeneticEvent === this.selectedEventType;


    return isAfterStartDate && isBeforeEndDate && isEventTypeMatch;
  });

  this.groupedEvents = this.groupEventsByMonth(filtered);
  this.orderEvents();
}

resetStartDate() {
  this.startDate = null;
  this.filterEvents();
}
resetEndDate() {
  this.endDate = null;
  this.filterEvents();
}

toggleEventOrder() {
  this.isOldestFirst = !this.isOldestFirst; // Cambia el estado del orden
  this.orderEvents();
}

toggleEventsPanel() {
  this.showEventsPanel = !this.showEventsPanel;
}

toggleAllInCategory(category: string, selected: boolean) {
  if (this.extractedEvents && this.extractedEvents[category]) {
    this.extractedEvents[category].forEach(item => item.selected = selected);
  }
}

orderEvents() {
  this.groupedEvents.sort((a, b) => {
    const dateA = a.monthYear.getTime(); // Convertir a timestamp
    const dateB = b.monthYear.getTime(); // Convertir a timestamp
    return this.isOldestFirst ? dateA - dateB : dateB - dateA;
  });

  this.groupedEvents.forEach(group => {
    group.events.sort((a, b) => {
      const dateA = new Date(a.date).getTime(); // Convertir a timestamp
      const dateB = new Date(b.date).getTime(); // Convertir a timestamp
      return this.isOldestFirst ? dateA - dateB : dateB - dateA;
    });
  });
  console.log(this.groupedEvents)
}

async translateInverseSummary2(msg): Promise<string> {
  return new Promise((resolve, reject) => {

    if (this.lang != 'en') {
      var jsontestLangText = [{ "Text": msg }]
      this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            msg = res2.text;
          }
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }));
    } else {
      this.summaryPatient = msg;
      this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
      this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
      this.callingSummary = false;
      resolve('ok')
    }
  });
}

getLocationsByCountry(locations: any[]): { [key: string]: { locations: any[] } } {
  if (!locations) return {};
  
  // Group locations by country
  const groupedLocations = locations.reduce((acc, location) => {
    const country = location.country || 'Unknown';
    if (!acc[country]) {
      acc[country] = {
        locations: []
      };
    }
    // Add isExpanded property if it doesn't exist
    if (!location.hasOwnProperty('isExpanded')) {
      location.isExpanded = false;
    }
    acc[country].locations.push(location);
    return acc;
  }, {});

  // Sort locations within each country by city
  Object.keys(groupedLocations).forEach(country => {
    groupedLocations[country].locations.sort((a, b) => {
      const cityA = (a.city || '').toLowerCase();
      const cityB = (b.city || '').toLowerCase();
      return cityA.localeCompare(cityB);
    });
  });

  return groupedLocations;
}

async translateInverseSummary(msg): Promise<string> {
  return new Promise((resolve, reject) => {
    // Función auxiliar para procesar el contenido de la tabla
    const processTable = (tableContent) => {
      return tableContent.replace(/\n/g, ''); // Eliminar saltos de línea dentro de la tabla
    };

    // Función auxiliar para procesar el texto fuera de las tablas
    const processNonTableContent = (text) => {
      return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
    };

    if (this.lang != 'en') {
      var jsontestLangText = [{ "Text": msg }]
      this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            msg = res2.text;
          }
          
          // Aquí procesamos el mensaje
          const parts = msg.split(/(<table>|<\/table>)/); // Divide el mensaje en partes de tabla y no tabla
          this.summaryPatient = parts.map((part, index) => {
            if (index % 4 === 2) { // Los segmentos de tabla estarán en las posiciones 2, 6, 10, etc. (cada 4 desde el segundo)
              return processTable(part);
            } else {
              return processNonTableContent(part);
            }
          }).join('');

          this.callingSummary = false;
          resolve('ok');
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.summaryPatient = processNonTableContent(msg);
          this.callingSummary = false;
          resolve('ok');
        }));
    } else {
      this.summaryPatient = processNonTableContent(msg);
      this.callingSummary = false;
      resolve('ok');
    }
  });
}


/* let testLangText = '';
    for (let doc of this.docs) {
      if(doc.state == 'done'){
        testLangText+=doc.medicalText;
      }
    }
    testLangText = testLangText.substr(0, 2000)
    this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {

          }

          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            this.toastr.error('', this.translate.instant("generics.error try again"));
          }));
          */

          async deleteChat() {
            this.messages = [];
            this.initChat();
          }

          initChat() {
            if (this.messages.length == 0) {
              this.messages = [];
              if (this.docs.length == 0) {
                this.messages.push({
                  text: this.translate.instant('home.botmsg1'),
                  isUser: false
                });
              } else {
                this.messages.push({
                  text: this.translate.instant('home.botmsg2'),
                  isUser: false
                });
              }
            }
        
          }

          //this.summaryPatient= '<div><h3>ملخص المعلومات الجينية</h3><p>المعلومات الجينية التي قمت بتحميلها تشكل تقريراً جينياً وتساعد في شرح الأسباب الجينية المحتملة لحالتك الصحية.</p><p>المريض: خوان بيريز</p><p>يحدد هذا التقرير الطفرات الجينية الخاصة التي قد تكون مرتبطة بمرضك، وهو مرض عضلة القلب. إليك ملخص لأهم النتائج:</p><ul><li><strong>الجين TTN:</strong> طفرة حذف (c.80248_80251del) مصنفة كمرضية. تؤثر هذه الطفرة على وظيفة الجين، مما يؤدي إلى بروتين مقطوع. الطفرات في TTN مرتبطة بمرض عضلة القلب المتوسع السائد الوراثي.</li><li><strong>الجين MYH7:</strong> طفرة بلا معنى (c.742G&gt;A) مصنفة كمحتملة الضرر. تؤثر هذه الطفرة على جزء حيوي من الجين، وهو مهم لوظيفة عضلة القلب. الطفرات في MYH7 مرتبطة بأشكال مختلفة من أمراض عضلة القلب.</li><li><strong>الجين LMNA:</strong> طفرة بلا معنى (c.1588C&gt;T) ذات معنى غير مؤكد. تقع هذه الطفرة في منطقة حاسمة من الجين، والتي تلعب دوراً في الحفاظ على بنية نواة الخلية. قد تسبب الطفرات في LMNA أمراض عضلة القلب والضمور العضلي، لكن التأثير الدقيق لهذه الطفرة المحددة لا يزال غير واضح.</li></ul><p><strong>توصيات أخرى:</strong></p><ul><li>التقييم السريري: يُوصى بإجراء تقييم سريري مفصل لأفراد عائلتك لتحديد الحاملين المحتملين لهذه الطفرات الجينية.</li><li>الاستشارة الجينية: يُقترح أن تتلقى أنت وعائلتك استشارة جينية لمناقشة هذه النتائج وتداعياتها.</li><li>المتابعة الطبية: يُنصح بمتابعة منتظمة مع أخصائي أمراض القلب المتخصص في الأمراض الجينية.</li></ul><p>تهدف هذه المعلومات إلى مساعدتك على فهم حالتك الجينية بشكل أفضل وتسهيل المحادثات المستنيرة مع مقدمي الرعاية الصحية الخاصين بك.</p></div><output>{ "تقنية_جينية": "الإكسوم", "الطفرات_المرضية": true, "قائمة_الطفرات_المرضية": [ {"طفرة": "c.80248_80251del", "تاريخ": "2024-05-10"} ], "التراث_الجيني": "السائد الوراثي الجسمي", "تأكيد_الاختبارات_الأبوية": false}</output>'
          async download(){
            let questionnaire = 'ah7rg7N8';
            if(this.lang == 'es'){
              questionnaire = 'z6hgZFGs';
            }
            let url = 'https://davlv9v24on.typeform.com/to/'+questionnaire+'#uuid='+this.paramForm+'&role='+this.actualRole+'&mode='+this.submode
            const qrCodeDataURL = await QRCode.toDataURL(url);
            console.log(this.summaryPatient)
            let tempSumary = this.summaryPatient.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');
            this.jsPDFService.generateResultsPDF2(tempSumary, this.translate.store.currentLang, qrCodeDataURL)
            /* let htmldemo={"text":"<div><br>  <h3>Resumen médico</h3><br>  <p>Los documentos que acaba de cargar son historiales médicos y ayudan a explicar su historial de salud, su estado actual y los tratamientos en curso. Este resumen está diseñado para ofrecerle una comprensión clara de su situación médica.</p><br>  <h4>Presentación del paciente</h4><br>  <p>El paciente es Sergio Isla Miranda, un varón de 14 años con un historial de afecciones médicas complejas, principalmente de naturaleza neurológica.</p><br>  <h4>Diagnósticos</h4><br>  <ul><br>    <li><strong>Epilepsia:</strong> Sergio padece epilepsia refractaria, concretamente Síndrome de Dravet, que es una forma grave de epilepsia de difícil tratamiento.</li><br>    <li><strong>Trastornos del desarrollo:</strong> Tiene un trastorno generalizado del desarrollo y un trastorno grave del lenguaje expresivo y comprensivo.</li><br>    <li><strong>Condiciones físicas:</strong> Sergio también tiene los pies muy arqueados (pies cavos), anemia ferropénica y una curvatura de la columna vertebral (escoliosis dorsolumbar).</li><br>  </ul><br>  <h4>Tratamiento y medicación</h4><br>  <ul><br>    <li><strong>Medicación:</strong> Sergio toma varios medicamentos, entre ellos Diacomit, Depakine, Noiafren y Fenfluramina para controlar su epilepsia.</li><br>    <li><strong>Suplementos:</strong> También toma suplementos de hierro para tratar su anemia.</li><br>    <li><strong>Terapias:</strong> Participa en fisioterapia, logopedia y educación física adaptada para favorecer su desarrollo y su salud física.</li><br>  </ul><br>  <h4>Otros</h4><br>  <ul><br>    <li>Sergio ha sufrido estados epilépticos, que son ataques prolongados que requieren atención médica inmediata.</li><br>    <li>Tiene una mutación en el gen SCN1A, que está asociada a su epilepsia.</li><br>    <li>Su plan de tratamiento se sigue de cerca y se ajusta según sea necesario para controlar su enfermedad.</li><br>    <li>Sergio requiere atención y seguimiento continuos debido a la gravedad de su epilepsia, que puede incluir emergencias potencialmente mortales como una parada cardiaca.</li><br>  </ul><br>  <p>Es importante que Sergio y sus cuidadores mantengan una comunicación abierta con los profesionales sanitarios para garantizar el mejor tratamiento posible de su enfermedad.</p><br></div>"};
            htmldemo.text = htmldemo.text.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');
            this.jsPDFService.generateResultsPDF(htmldemo.text, this.translate.store.currentLang, qrCodeDataURL)*/
          }

          async download2(){
            let questionnaire = 'ah7rg7N8';
            let url = 'https://davlv9v24on.typeform.com/to/'+questionnaire+'#uuid='+this.paramForm+'&role='+this.actualRole+'&mode='+this.submode
            const qrCodeDataURL = await QRCode.toDataURL(url);
            console.log(this.translatedText)
            /*let tempSumary = this.translatedText.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');*/
            let test2 = '<div><h3>مقدمة التقرير</h3><p>المعلومات الجينية التي قمت بتحميلها تمثل تقرير تحليل جيني وتساعد في تفسير الأسباب الجينية المحتملة لحالتك الصحية.</p></div><div><h3>التقنية الجينية</h3><p>لتحليلك، استخدمنا طريقة تعرف بتسلسل الإكسوم. هذه الطريقة تركز على أجزاء الحمض النووي الخاص بك التي تحتوي على التعليمات لصنع البروتينات، وهي مكونات أساسية لجسمك. على الرغم من أن الإكسوم يشكل جزءًا صغيرًا فقط من الحمض النووي الكلي لديك، إلا أنه يحتوي على معظم التغيرات الجينية التي تسبب الأمراض. من خلال التركيز على هذه المنطقة الحرجة، يمكننا تحديد العوامل الجينية المحتملة التي قد تؤثر على صحتك بفعالية.</p></div><br/><div><h3>المعلومات الجينية</h3><p>يوفر هذا التقرير تحليلًا لمعلوماتك الجينية لتحديد أي تغيرات قد تكون مرتبطة بحالتك الصحية، مع التركيز بشكل خاص على الجينات المرتبطة بأمراض عضلة القلب.</p><p><strong>المريض:</strong> خوان بيريز</p><p>تاريخ <strong>الميلاد</strong>: 15/03/1980</p><p><strong>التغيرات الجينية الهامة المحددة:</strong></p><ul><li><strong>جين TTN:</strong> تغير بالحذف (c.80248_80251del) مصنف كمرضي. هذا التغير يسبب تغييرًا في الجين، مما يؤدي إلى بروتين مقطوع. الطفرات في جين TTN مرتبطة بمرض توسع عضلة القلب، الذي قد يؤثر على وظيفة القلب.</li><li><strong>جين MYH7:</strong> تغير بلا معنى (c.742G&gt;A) مصنف كمحتمل مرضي. هذا التغير يعدل جزءًا محافظًا جدًا من الجين، وهو مهم لوظيفة عضلة القلب. الطفرات في جين MYH7 مرتبطة بعدة أشكال من أمراض عضلة القلب.</li><li><strong>جين LMNA:</strong> تغير بلا معنى (c.1588C&gt;T) ذو معنى غير مؤكد. هذا التغير يقع في منطقة حرجة من الجين، التي تشارك في بنية نواة الخلية. الطفرات في جين LMNA يمكن أن تسبب مجموعة من الأمراض، بما في ذلك أمراض عضلة القلب والضمور العضلي، لكن التأثير الدقيق لهذا التغير المحدد لا يزال غير واضح.</li></ul><p><strong>الحالات المرتبطة:</strong> من المحتمل أن تكون التغيرات المحددة في جينات TTN و MYH7 مسؤولة عن مرض توسع عضلة القلب الملاحظ فيك. أهمية التغير في جين LMNA لا تزال غير مؤكدة وتتطلب مزيدًا من البحث.</p></div><div><h3>التغيرات الجينية المرضية</h3><p>خلال تحليل مادتك الجينية، حددنا تغيرات في الحمض النووي الخاص بك تعرف بالتغيرات الجينية المرضية. هذه التغيرات قد ارتبطت سابقًا بمشاكل صحية محددة. ومع ذلك، من المهم أن تأخذ في الاعتبار أن وجود تغير جيني مرضي لا يعني بالضرورة أنك ستطور الحالة المرتبطة به، حيث يمكن لعوامل جينية وبيئية أخرى أن تؤثر على النتيجة. سيعمل مقدم الرعاية الصحية الخاص بك معك لتقييم مخاطرك الفردية ومناقشة استراتيجيات الإدارة المناسبة.</p></div><br/><div><h3>التراث الجيني</h3><p>وفقًا لنتائجك، يتبع التغير الجيني المحدد نمطًا من الوراثة السائدة الجسمية. هذا يعني أنه يكفي وجود نسخة واحدة من الجين المتغير لامتلاك الصفة أو الحالة المرتبطة بها. إذا كنت تعاني من مرض جسمي سائد، فإن كل طفل من أطفالك لديه فرصة بنسبة 50% لوراثته منك. بعض الأمثلة المعروفة للحالات التي تتبع هذا النمط هي مرض هنتنغتون والتقزم الغضروفي.</p></div><br/><div><h3>معلومات إضافية</h3><p><strong>التوصيات:</strong></p><ul><li>تقييم سريري لأفراد عائلتك لتحديد الحاملين المحتملين للتغيرات الجينية المرضية.</li><li>الاستشارة الجينية لك ولعائلتك لمناقشة النتائج وتداعياتها.</li><li>المتابعة الدورية مع أخصائي أمراض القلب المتخصص في الأمراض الجينية القلبية.</li></ul></div><div><h3>مقدمة التقرير</h3><p>المعلومات الجينية التي قمت بتحميلها تمثل تقرير تحليل جيني وتساعد في تفسير الأسباب الجينية المحتملة لحالتك الصحية.</p></div><div><h3>التقنية الجينية</h3><p>لتحليلك، استخدمنا طريقة تعرف بتسلسل الإكسوم. هذه الطريقة تركز على أجزاء الحمض النووي الخاص بك التي تحتوي على التعليمات لصنع البروتينات، وهي مكونات أساسية لجسمك. على الرغم من أن الإكسوم يشكل جزءًا صغيرًا فقط من الحمض النووي الكلي لديك، إلا أنه يحتوي على معظم التغيرات الجينية التي تسبب الأمراض. من خلال التركيز على هذه المنطقة الحرجة، يمكننا تحديد العوامل الجينية المحتملة التي قد تؤثر على صحتك بفعالية.</p></div><br/><div><h3>المعلومات الجينية</h3><p>يوفر هذا التقرير تحليلًا لمعلوماتك الجينية لتحديد أي تغيرات قد تكون مرتبطة بحالتك الصحية، مع التركيز بشكل خاص على الجينات المرتبطة بأمراض عضلة القلب.</p><p><strong>المريض:</strong> خوان بيريز</p><p>تاريخ <strong>الميلاد</strong>: 15/03/1980</p><p><strong>التغيرات الجينية الهامة المحددة:</strong></p><ul><li><strong>جين TTN:</strong> تغير بالحذف (c.80248_80251del) مصنف كمرضي. هذا التغير يسبب تغييرًا في الجين، مما يؤدي إلى بروتين مقطوع. الطفرات في جين TTN مرتبطة بمرض توسع عضلة القلب، الذي قد يؤثر على وظيفة القلب.</li><li><strong>جين MYH7:</strong> تغير بلا معنى (c.742G&gt;A) مصنف كمحتمل مرضي. هذا التغير يعدل جزءًا محافظًا جدًا من الجين، وهو مهم لوظيفة عضلة القلب. الطفرات في جين MYH7 مرتبطة بعدة أشكال من أمراض عضلة القلب.</li><li><strong>جين LMNA:</strong> تغير بلا معنى (c.1588C&gt;T) ذو معنى غير مؤكد. هذا التغير يقع في منطقة حرجة من الجين، التي تشارك في بنية نواة الخلية. الطفرات في جين LMNA يمكن أن تسبب مجموعة من الأمراض، بما في ذلك أمراض عضلة القلب والضمور العضلي، لكن التأثير الدقيق لهذا التغير المحدد لا يزال غير واضح.</li></ul><p><strong>الحالات المرتبطة:</strong> من المحتمل أن تكون التغيرات المحددة في جينات TTN و MYH7 مسؤولة عن مرض توسع عضلة القلب الملاحظ فيك. أهمية التغير في جين LMNA لا تزال غير مؤكدة وتتطلب مزيدًا من البحث.</p></div><div><h3>التغيرات الجينية المرضية</h3><p>خلال تحليل مادتك الجينية، حددنا تغيرات في الحمض النووي الخاص بك تعرف بالتغيرات الجينية المرضية. هذه التغيرات قد ارتبطت سابقًا بمشاكل صحية محددة. ومع ذلك، من المهم أن تأخذ في الاعتبار أن وجود تغير جيني مرضي لا يعني بالضرورة أنك ستطور الحالة المرتبطة به، حيث يمكن لعوامل جينية وبيئية أخرى أن تؤثر على النتيجة. سيعمل مقدم الرعاية الصحية الخاص بك معك لتقييم مخاطرك الفردية ومناقشة استراتيجيات الإدارة المناسبة.</p></div><br/><div><h3>التراث الجيني</h3><p>وفقًا لنتائجك، يتبع التغير الجيني المحدد نمطًا من الوراثة السائدة الجسمية. هذا يعني أنه يكفي وجود نسخة واحدة من الجين المتغير لامتلاك الصفة أو الحالة المرتبطة بها. إذا كنت تعاني من مرض جسمي سائد، فإن كل طفل من أطفالك لديه فرصة بنسبة 50% لوراثته منك. بعض الأمثلة المعروفة للحالات التي تتبع هذا النمط هي مرض هنتنغتون والتقزم الغضروفي.</p></div><br/><div><h3>معلومات إضافية</h3><p><strong>التوصيات:</strong></p><ul><li>تقييم سريري لأفراد عائلتك لتحديد الحاملين المحتملين للتغيرات الجينية المرضية.</li><li>الاستشارة الجينية لك ولعائلتك لمناقشة النتائج وتداعياتها.</li><li>المتابعة الدورية مع أخصائي أمراض القلب المتخصص في الأمراض الجينية القلبية.</li></ul></div><div><h3>مقدمة التقرير</h3><p>المعلومات الجينية التي قمت بتحميلها تمثل تقرير تحليل جيني وتساعد في تفسير الأسباب الجينية المحتملة لحالتك الصحية.</p></div><div><h3>التقنية الجينية</h3><p>لتحليلك، استخدمنا طريقة تعرف بتسلسل الإكسوم. هذه الطريقة تركز على أجزاء الحمض النووي الخاص بك التي تحتوي على التعليمات لصنع البروتينات، وهي مكونات أساسية لجسمك. على الرغم من أن الإكسوم يشكل جزءًا صغيرًا فقط من الحمض النووي الكلي لديك، إلا أنه يحتوي على معظم التغيرات الجينية التي تسبب الأمراض. من خلال التركيز على هذه المنطقة الحرجة، يمكننا تحديد العوامل الجينية المحتملة التي قد تؤثر على صحتك بفعالية.</p></div><br/><div><h3>المعلومات الجينية</h3><p>يوفر هذا التقرير تحليلًا لمعلوماتك الجينية لتحديد أي تغيرات قد تكون مرتبطة بحالتك الصحية، مع التركيز بشكل خاص على الجينات المرتبطة بأمراض عضلة القلب.</p><p><strong>المريض:</strong> خوان بيريز</p><p>تاريخ <strong>الميلاد</strong>: 15/03/1980</p><p><strong>التغيرات الجينية الهامة المحددة:</strong></p><ul><li><strong>جين TTN:</strong> تغير بالحذف (c.80248_80251del) مصنف كمرضي. هذا التغير يسبب تغييرًا في الجين، مما يؤدي إلى بروتين مقطوع. الطفرات في جين TTN مرتبطة بمرض توسع عضلة القلب، الذي قد يؤثر على وظيفة القلب.</li><li><strong>جين MYH7:</strong> تغير بلا معنى (c.742G&gt;A) مصنف كمحتمل مرضي. هذا التغير يعدل جزءًا محافظًا جدًا من الجين، وهو مهم لوظيفة عضلة القلب. الطفرات في جين MYH7 مرتبطة بعدة أشكال من أمراض عضلة القلب.</li><li><strong>جين LMNA:</strong> تغير بلا معنى (c.1588C&gt;T) ذو معنى غير مؤكد. هذا التغير يقع في منطقة حرجة من الجين، التي تشارك في بنية نواة الخلية. الطفرات في جين LMNA يمكن أن تسبب مجموعة من الأمراض، بما في ذلك أمراض عضلة القلب والضمور العضلي، لكن التأثير الدقيق لهذا التغير المحدد لا يزال غير واضح.</li></ul><p><strong>الحالات المرتبطة:</strong> من المحتمل أن تكون التغيرات المحددة في جينات TTN و MYH7 مسؤولة عن مرض توسع عضلة القلب الملاحظ فيك. أهمية التغير في جين LMNA لا تزال غير مؤكدة وتتطلب مزيدًا من البحث.</p></div><div><h3>التغيرات الجينية المرضية</h3><p>خلال تحليل مادتك الجينية، حددنا تغيرات في الحمض النووي الخاص بك تعرف بالتغيرات الجينية المرضية. هذه التغيرات قد ارتبطت سابقًا بمشاكل صحية محددة. ومع ذلك، من المهم أن تأخذ في الاعتبار أن وجود تغير جيني مرضي لا يعني بالضرورة أنك ستطور الحالة المرتبطة به، حيث يمكن لعوامل جينية وبيئية أخرى أن تؤثر على النتيجة. سيعمل مقدم الرعاية الصحية الخاص بك معك لتقييم مخاطرك الفردية ومناقشة استراتيجيات الإدارة المناسبة.</p></div><br/><div><h3>التراث الجيني</h3><p>وفقًا لنتائجك، يتبع التغير الجيني المحدد نمطًا من الوراثة السائدة الجسمية. هذا يعني أنه يكفي وجود نسخة واحدة من الجين المتغير لامتلاك الصفة أو الحالة المرتبطة بها. إذا كنت تعاني من مرض جسمي سائد، فإن كل طفل من أطفالك لديه فرصة بنسبة 50% لوراثته منك. بعض الأمثلة المعروفة للحالات التي تتبع هذا النمط هي مرض هنتنغتون والتقزم الغضروفي.</p></div><br/><div><h3>معلومات إضافية</h3><p><strong>التوصيات:</strong></p><ul><li>تقييم سريري لأفراد عائلتك لتحديد الحاملين المحتملين للتغيرات الجينية المرضية.</li><li>الاستشارة الجينية لك ولعائلتك لمناقشة النتائج وتداعياتها.</li><li>المتابعة الدورية مع أخصائي أمراض القلب المتخصص في الأمراض الجينية القلبية.</li></ul></div><div><h3>مقدمة التقرير</h3><p>المعلومات الجينية التي قمت بتحميلها تمثل تقرير تحليل جيني وتساعد في تفسير الأسباب الجينية المحتملة لحالتك الصحية.</p></div><div><h3>التقنية الجينية</h3><p>لتحليلك، استخدمنا طريقة تعرف بتسلسل الإكسوم. هذه الطريقة تركز على أجزاء الحمض النووي الخاص بك التي تحتوي على التعليمات لصنع البروتينات، وهي مكونات أساسية لجسمك. على الرغم من أن الإكسوم يشكل جزءًا صغيرًا فقط من الحمض النووي الكلي لديك، إلا أنه يحتوي على معظم التغيرات الجينية التي تسبب الأمراض. من خلال التركيز على هذه المنطقة الحرجة، يمكننا تحديد العوامل الجينية المحتملة التي قد تؤثر على صحتك بفعالية.</p></div><br/><div><h3>المعلومات الجينية</h3><p>يوفر هذا التقرير تحليلًا لمعلوماتك الجينية لتحديد أي تغيرات قد تكون مرتبطة بحالتك الصحية، مع التركيز بشكل خاص على الجينات المرتبطة بأمراض عضلة القلب.</p><p><strong>المريض:</strong> خوان بيريز</p><p>تاريخ <strong>الميلاد</strong>: 15/03/1980</p><p><strong>التغيرات الجينية الهامة المحددة:</strong></p><ul><li><strong>جين TTN:</strong> تغير بالحذف (c.80248_80251del) مصنف كمرضي. هذا التغير يسبب تغييرًا في الجين، مما يؤدي إلى بروتين مقطوع. الطفرات في جين TTN مرتبطة بمرض توسع عضلة القلب، الذي قد يؤثر على وظيفة القلب.</li><li><strong>جين MYH7:</strong> تغير بلا معنى (c.742G&gt;A) مصنف كمحتمل مرضي. هذا التغير يعدل جزءًا محافظًا جدًا من الجين، وهو مهم لوظيفة عضلة القلب. الطفرات في جين MYH7 مرتبطة بعدة أشكال من أمراض عضلة القلب.</li><li><strong>جين LMNA:</strong> تغير بلا معنى (c.1588C&gt;T) ذو معنى غير مؤكد. هذا التغير يقع في منطقة حرجة من الجين، التي تشارك في بنية نواة الخلية. الطفرات في جين LMNA يمكن أن تسبب مجموعة من الأمراض، بما في ذلك أمراض عضلة القلب والضمور العضلي، لكن التأثير الدقيق لهذا التغير المحدد لا يزال غير واضح.</li></ul><p><strong>الحالات المرتبطة:</strong> من المحتمل أن تكون التغيرات المحددة في جينات TTN و MYH7 مسؤولة عن مرض توسع عضلة القلب الملاحظ فيك. أهمية التغير في جين LMNA لا تزال غير مؤكدة وتتطلب مزيدًا من البحث.</p></div><div><h3>التغيرات الجينية المرضية</h3><p>خلال تحليل مادتك الجينية، حددنا تغيرات في الحمض النووي الخاص بك تعرف بالتغيرات الجينية المرضية. هذه التغيرات قد ارتبطت سابقًا بمشاكل صحية محددة. ومع ذلك، من المهم أن تأخذ في الاعتبار أن وجود تغير جيني مرضي لا يعني بالضرورة أنك ستطور الحالة المرتبطة به، حيث يمكن لعوامل جينية وبيئية أخرى أن تؤثر على النتيجة. سيعمل مقدم الرعاية الصحية الخاص بك معك لتقييم مخاطرك الفردية ومناقشة استراتيجيات الإدارة المناسبة.</p></div><br/><div><h3>التراث الجيني</h3><p>وفقًا لنتائجك، يتبع التغير الجيني المحدد نمطًا من الوراثة السائدة الجسمية. هذا يعني أنه يكفي وجود نسخة واحدة من الجين المتغير لامتلاك الصفة أو الحالة المرتبطة بها. إذا كنت تعاني من مرض جسمي سائد، فإن كل طفل من أطفالك لديه فرصة بنسبة 50% لوراثته منك. بعض الأمثلة المعروفة للحالات التي تتبع هذا النمط هي مرض هنتنغتون والتقزم الغضروفي.</p></div><br/><div><h3>معلومات إضافية</h3><p><strong>التوصيات:</strong></p><ul><li>تقييم سريري لأفراد عائلتك لتحديد الحاملين المحتملين للتغيرات الجينية المرضية.</li><li>الاستشارة الجينية لك ولعائلتك لمناقشة النتائج وتداعياتها.</li><li>المتابعة الدورية مع أخصائي أمراض القلب المتخصص في الأمراض الجينية القلبية.</li></ul></div>';
            let test = '<output><div title="Intro"><h3>报告介绍</h3><p>您刚刚上传的遗传信息是一份遗传分析报告，它有助于解释患者心肌病可能的遗传原因。本报告的目的是识别可能与患者临床状况相关的遗传变异。</p></div><div title="Genetic Technique"><p>在分析中，我们采用了一种称为外显子测序的方法。这种选择性的方法专注于您DNA中包含制造蛋白质指令的部分，而蛋白质是您身体中基本的构建模块。尽管外显子只占您全部DNA的一小部分，但大多数导致疾病的遗传变化都发生在这里。通过专注于这一关键区域，我们可以有效地识别可能影响您健康的潜在遗传因素。</p></div><br/><div title="Genetic"><h3>遗传信息</h3><p>患者：Juan Pérez，出生于1980年3月15日，有扩张型心肌病（CMD）病史和家族心肌病及心律失常史。遗传分析识别了几种与心肌病相关的基因变异：</p><ul><li><strong>TTN基因：</strong>一种被归类为致病性的缺失变异（c.80248_80251del）。这种变异打乱了基因的阅读框架，导致产生一个截短的蛋白质。TTN基因的突变与常染色体显性遗传的扩张型心肌病有关。</li><li><strong>MYH7基因：</strong>一种被认为可能致病的无意义变异（c.742G>A）。这种变异影响到心脏β肌球蛋白重链中一个高度保守的残基。MYH7基因的突变与多种形式的心肌病有关。</li><li><strong>LMNA基因：</strong>一种意义不明的无意义变异（c.1588C>T）。这种变异位于LMNA基因的一个关键区域，该基因编码蛋白质lamin A/C。LMNA基因的突变可以导致一系列疾病，如心肌病和肌肉营养不良，但这个特定变异的确切影响尚不清楚。</li></ul></div><div title="Pathogenic Variants"><p>在分析您的遗传物质时，我们识别了被称为致病性变异的DNA变化。这些改变以前已经与特定健康问题相关联。然而，重要的是要注意，拥有一个致病性变异并不一定意味着您就会发展出相关的疾病，因为其他遗传和环境因素也可能影响结果。您的医疗服务提供者将与您合作评估您的个人风险，并讨论适当的管理策略。</p></div><br/><div title="Genetic Heritage"><p>根据您的结果，所识别的遗传变化遵循常染色体显性遗传模式。这意味着只需要一个改变的基因副本就能表现出相关的特征或疾病。如果您患有常染色体显性疾病，您的每个孩子都有50%的几率从您那里继承它。一些众所周知的遵循这种模式的疾病包括亨廷顿病和软骨发育不全。</p></div><br/><div title="Paternal Tests Confirmation"><p>考虑到在您的DNA中发现的遗传变异，我们建议您进行亲子鉴定测试。通过分析您父母的遗传物质，我们可以确定您的结果中识别的变异是遗传的还是自发产生的。这些额外的信息可以提供有关您和家庭成员健康风险的宝贵信息。您的医疗专业人员可以指导您完成父母分析的过程，并帮助您理解结果的含义。</p></div><br/><div title="Others"><h3>附加信息</h3><p>建议包括对患者家庭成员进行详细的临床评估，以识别可能携带致病性变异的人，提供遗传咨询以讨论结果及其含义，以及定期与专门从事遗传性疾病的心脏病专家进行随访。</p></div><div title="Intro"><h3>报告介绍</h3><p>您刚刚上传的遗传信息是一份遗传分析报告，它有助于解释患者心肌病可能的遗传原因。本报告的目的是识别可能与患者临床状况相关的遗传变异。</p></div><div title="Genetic Technique"><p>在分析中，我们采用了一种称为外显子测序的方法。这种选择性的方法专注于您DNA中包含制造蛋白质指令的部分，而蛋白质是您身体中基本的构建模块。尽管外显子只占您全部DNA的一小部分，但大多数导致疾病的遗传变化都发生在这里。通过专注于这一关键区域，我们可以有效地识别可能影响您健康的潜在遗传因素。</p></div><br/><div title="Genetic"><h3>遗传信息</h3><p>患者：Juan Pérez，出生于1980年3月15日，有扩张型心肌病（CMD）病史和家族心肌病及心律失常史。遗传分析识别了几种与心肌病相关的基因变异：</p><ul><li><strong>TTN基因：</strong>一种被归类为致病性的缺失变异（c.80248_80251del）。这种变异打乱了基因的阅读框架，导致产生一个截短的蛋白质。TTN基因的突变与常染色体显性遗传的扩张型心肌病有关。</li><li><strong>MYH7基因：</strong>一种被认为可能致病的无意义变异（c.742G>A）。这种变异影响到心脏β肌球蛋白重链中一个高度保守的残基。MYH7基因的突变与多种形式的心肌病有关。</li><li><strong>LMNA基因：</strong>一种意义不明的无意义变异（c.1588C>T）。这种变异位于LMNA基因的一个关键区域，该基因编码蛋白质lamin A/C。LMNA基因的突变可以导致一系列疾病，如心肌病和肌肉营养不良，但这个特定变异的确切影响尚不清楚。</li></ul></div><div title="Pathogenic Variants"><p>在分析您的遗传物质时，我们识别了被称为致病性变异的DNA变化。这些改变以前已经与特定健康问题相关联。然而，重要的是要注意，拥有一个致病性变异并不一定意味着您就会发展出相关的疾病，因为其他遗传和环境因素也可能影响结果。您的医疗服务提供者将与您合作评估您的个人风险，并讨论适当的管理策略。</p></div><br/><div title="Genetic Heritage"><p>根据您的结果，所识别的遗传变化遵循常染色体显性遗传模式。这意味着只需要一个改变的基因副本就能表现出相关的特征或疾病。如果您患有常染色体显性疾病，您的每个孩子都有50%的几率从您那里继承它。一些众所周知的遵循这种模式的疾病包括亨廷顿病和软骨发育不全。</p></div><br/><div title="Paternal Tests Confirmation"><p>考虑到在您的DNA中发现的遗传变异，我们建议您进行亲子鉴定测试。通过分析您父母的遗传物质，我们可以确定您的结果中识别的变异是遗传的还是自发产生的。这些额外的信息可以提供有关您和家庭成员健康风险的宝贵信息。您的医疗专业人员可以指导您完成父母分析的过程，并帮助您理解结果的含义。</p></div><br/><div title="Others"><h3>附加信息</h3><p>建议包括对患者家庭成员进行详细的临床评估，以识别可能携带致病性变异的人，提供遗传咨询以讨论结果及其含义，以及定期与专门从事遗传性疾病的心脏病专家进行随访。</p></div><div title="Intro"><h3>报告介绍</h3><p>您刚刚上传的遗传信息是一份遗传分析报告，它有助于解释患者心肌病可能的遗传原因。本报告的目的是识别可能与患者临床状况相关的遗传变异。</p></div><div title="Genetic Technique"><p>在分析中，我们采用了一种称为外显子测序的方法。这种选择性的方法专注于您DNA中包含制造蛋白质指令的部分，而蛋白质是您身体中基本的构建模块。尽管外显子只占您全部DNA的一小部分，但大多数导致疾病的遗传变化都发生在这里。通过专注于这一关键区域，我们可以有效地识别可能影响您健康的潜在遗传因素。</p></div><br/><div title="Genetic"><h3>遗传信息</h3><p>患者：Juan Pérez，出生于1980年3月15日，有扩张型心肌病（CMD）病史和家族心肌病及心律失常史。遗传分析识别了几种与心肌病相关的基因变异：</p><ul><li><strong>TTN基因：</strong>一种被归类为致病性的缺失变异（c.80248_80251del）。这种变异打乱了基因的阅读框架，导致产生一个截短的蛋白质。TTN基因的突变与常染色体显性遗传的扩张型心肌病有关。</li><li><strong>MYH7基因：</strong>一种被认为可能致病的无意义变异（c.742G>A）。这种变异影响到心脏β肌球蛋白重链中一个高度保守的残基。MYH7基因的突变与多种形式的心肌病有关。</li><li><strong>LMNA基因：</strong>一种意义不明的无意义变异（c.1588C>T）。这种变异位于LMNA基因的一个关键区域，该基因编码蛋白质lamin A/C。LMNA基因的突变可以导致一系列疾病，如心肌病和肌肉营养不良，但这个特定变异的确切影响尚不清楚。</li></ul></div><div title="Pathogenic Variants"><p>在分析您的遗传物质时，我们识别了被称为致病性变异的DNA变化。这些改变以前已经与特定健康问题相关联。然而，重要的是要注意，拥有一个致病性变异并不一定意味着您就会发展出相关的疾病，因为其他遗传和环境因素也可能影响结果。您的医疗服务提供者将与您合作评估您的个人风险，并讨论适当的管理策略。</p></div><br/><div title="Genetic Heritage"><p>根据您的结果，所识别的遗传变化遵循常染色体显性遗传模式。这意味着只需要一个改变的基因副本就能表现出相关的特征或疾病。如果您患有常染色体显性疾病，您的每个孩子都有50%的几率从您那里继承它。一些众所周知的遵循这种模式的疾病包括亨廷顿病和软骨发育不全。</p></div><br/><div title="Paternal Tests Confirmation"><p>考虑到在您的DNA中发现的遗传变异，我们建议您进行亲子鉴定测试。通过分析您父母的遗传物质，我们可以确定您的结果中识别的变异是遗传的还是自发产生的。这些额外的信息可以提供有关您和家庭成员健康风险的宝贵信息。您的医疗专业人员可以指导您完成父母分析的过程，并帮助您理解结果的含义。</p></div><br/><div title="Others"><h3>附加信息</h3><p>建议包括对患者家庭成员进行详细的临床评估，以识别可能携带致病性变异的人，提供遗传咨询以讨论结果及其含义，以及定期与专门从事遗传性疾病的心脏病专家进行随访。</p></div><div title="Intro"><h3>报告介绍</h3><p>您刚刚上传的遗传信息是一份遗传分析报告，它有助于解释患者心肌病可能的遗传原因。本报告的目的是识别可能与患者临床状况相关的遗传变异。</p></div><div title="Genetic Technique"><p>在分析中，我们采用了一种称为外显子测序的方法。这种选择性的方法专注于您DNA中包含制造蛋白质指令的部分，而蛋白质是您身体中基本的构建模块。尽管外显子只占您全部DNA的一小部分，但大多数导致疾病的遗传变化都发生在这里。通过专注于这一关键区域，我们可以有效地识别可能影响您健康的潜在遗传因素。</p></div><br/><div title="Genetic"><h3>遗传信息</h3><p>患者：Juan Pérez，出生于1980年3月15日，有扩张型心肌病（CMD）病史和家族心肌病及心律失常史。遗传分析识别了几种与心肌病相关的基因变异：</p><ul><li><strong>TTN基因：</strong>一种被归类为致病性的缺失变异（c.80248_80251del）。这种变异打乱了基因的阅读框架，导致产生一个截短的蛋白质。TTN基因的突变与常染色体显性遗传的扩张型心肌病有关。</li><li><strong>MYH7基因：</strong>一种被认为可能致病的无意义变异（c.742G>A）。这种变异影响到心脏β肌球蛋白重链中一个高度保守的残基。MYH7基因的突变与多种形式的心肌病有关。</li><li><strong>LMNA基因：</strong>一种意义不明的无意义变异（c.1588C>T）。这种变异位于LMNA基因的一个关键区域，该基因编码蛋白质lamin A/C。LMNA基因的突变可以导致一系列疾病，如心肌病和肌肉营养不良，但这个特定变异的确切影响尚不清楚。</li></ul></div><div title="Pathogenic Variants"><p>在分析您的遗传物质时，我们识别了被称为致病性变异的DNA变化。这些改变以前已经与特定健康问题相关联。然而，重要的是要注意，拥有一个致病性变异并不一定意味着您就会发展出相关的疾病，因为其他遗传和环境因素也可能影响结果。您的医疗服务提供者将与您合作评估您的个人风险，并讨论适当的管理策略。</p></div><br/><div title="Genetic Heritage"><p>根据您的结果，所识别的遗传变化遵循常染色体显性遗传模式。这意味着只需要一个改变的基因副本就能表现出相关的特征或疾病。如果您患有常染色体显性疾病，您的每个孩子都有50%的几率从您那里继承它。一些众所周知的遵循这种模式的疾病包括亨廷顿病和软骨发育不全。</p></div><br/><div title="Paternal Tests Confirmation"><p>考虑到在您的DNA中发现的遗传变异，我们建议您进行亲子鉴定测试。通过分析您父母的遗传物质，我们可以确定您的结果中识别的变异是遗传的还是自发产生的。这些额外的信息可以提供有关您和家庭成员健康风险的宝贵信息。您的医疗专业人员可以指导您完成父母分析的过程，并帮助您理解结果的含义。</p></div><br/><div title="Others"><h3>附加信息</h3><p>建议包括对患者家庭成员进行详细的临床评估，以识别可能携带致病性变异的人，提供遗传咨询以讨论结果及其含义，以及定期与专门从事遗传性疾病的心脏病专家进行随访。</p></div><div title="Intro"><h3>报告介绍</h3><p>您刚刚上传的遗传信息是一份遗传分析报告，它有助于解释患者心肌病可能的遗传原因。本报告的目的是识别可能与患者临床状况相关的遗传变异。</p></div><div title="Genetic Technique"><p>在分析中，我们采用了一种称为外显子测序的方法。这种选择性的方法专注于您DNA中包含制造蛋白质指令的部分，而蛋白质是您身体中基本的构建模块。尽管外显子只占您全部DNA的一小部分，但大多数导致疾病的遗传变化都发生在这里。通过专注于这一关键区域，我们可以有效地识别可能影响您健康的潜在遗传因素。</p></div><br/><div title="Genetic"><h3>遗传信息</h3><p>患者：Juan Pérez，出生于1980年3月15日，有扩张型心肌病（CMD）病史和家族心肌病及心律失常史。遗传分析识别了几种与心肌病相关的基因变异：</p><ul><li><strong>TTN基因：</strong>一种被归类为致病性的缺失变异（c.80248_80251del）。这种变异打乱了基因的阅读框架，导致产生一个截短的蛋白质。TTN基因的突变与常染色体显性遗传的扩张型心肌病有关。</li><li><strong>MYH7基因：</strong>一种被认为可能致病的无意义变异（c.742G>A）。这种变异影响到心脏β肌球蛋白重链中一个高度保守的残基。MYH7基因的突变与多种形式的心肌病有关。</li><li><strong>LMNA基因：</strong>一种意义不明的无意义变异（c.1588C>T）。这种变异位于LMNA基因的一个关键区域，该基因编码蛋白质lamin A/C。LMNA基因的突变可以导致一系列疾病，如心肌病和肌肉营养不良，但这个特定变异的确切影响尚不清楚。</li></ul></div><div title="Pathogenic Variants"><p>在分析您的遗传物质时，我们识别了被称为致病性变异的DNA变化。这些改变以前已经与特定健康问题相关联。然而，重要的是要注意，拥有一个致病性变异并不一定意味着您就会发展出相关的疾病，因为其他遗传和环境因素也可能影响结果。您的医疗服务提供者将与您合作评估您的个人风险，并讨论适当的管理策略。</p></div><br/><div title="Genetic Heritage"><p>根据您的结果，所识别的遗传变化遵循常染色体显性遗传模式。这意味着只需要一个改变的基因副本就能表现出相关的特征或疾病。如果您患有常染色体显性疾病，您的每个孩子都有50%的几率从您那里继承它。一些众所周知的遵循这种模式的疾病包括亨廷顿病和软骨发育不全。</p></div><br/><div title="Paternal Tests Confirmation"><p>考虑到在您的DNA中发现的遗传变异，我们建议您进行亲子鉴定测试。通过分析您父母的遗传物质，我们可以确定您的结果中识别的变异是遗传的还是自发产生的。这些额外的信息可以提供有关您和家庭成员健康风险的宝贵信息。您的医疗专业人员可以指导您完成父母分析的过程，并帮助您理解结果的含义。</p></div><br/><div title="Others"><h3>附加信息</h3><p>建议包括对患者家庭成员进行详细的临床评估，以识别可能携带致病性变异的人，提供遗传咨询以讨论结果及其含义，以及定期与专门从事遗传性疾病的心脏病专家进行随访。</p></div></output>'
            const nonLatinLanguages = [
              "am", "ar", "hy", "as", "av", "ba", "be", "bn", "bg", "my", "zh-CN", "cv", "ce", "ka", 
              "el", "gu", "he", "hi", "ja", "kn", "kk", "km", "ko", "ky", "lo", "mk", "ml", "mn", 
              "ne", "or", "pa", "fa", "ps", "ru", "sa", "si", "sd", "ta", "te", "th", "bo", "tk", 
              "ug", "uk", "ur", "uz", "vi", "yi"
          ];
      
          if (nonLatinLanguages.includes(this.selectedLanguage.code)) {
              await this.jsPDFService.generateResultsPDF(this.translatedText, this.translate.store.currentLang, qrCodeDataURL);
          } else {
              await this.jsPDFService.generateResultsPDF2(this.translatedText, this.translate.store.currentLang, qrCodeDataURL);
          }
            /* let htmldemo={"text":"<div><br>  <h3>Resumen médico</h3><br>  <p>Los documentos que acaba de cargar son historiales médicos y ayudan a explicar su historial de salud, su estado actual y los tratamientos en curso. Este resumen está diseñado para ofrecerle una comprensión clara de su situación médica.</p><br>  <h4>Presentación del paciente</h4><br>  <p>El paciente es Sergio Isla Miranda, un varón de 14 años con un historial de afecciones médicas complejas, principalmente de naturaleza neurológica.</p><br>  <h4>Diagnósticos</h4><br>  <ul><br>    <li><strong>Epilepsia:</strong> Sergio padece epilepsia refractaria, concretamente Síndrome de Dravet, que es una forma grave de epilepsia de difícil tratamiento.</li><br>    <li><strong>Trastornos del desarrollo:</strong> Tiene un trastorno generalizado del desarrollo y un trastorno grave del lenguaje expresivo y comprensivo.</li><br>    <li><strong>Condiciones físicas:</strong> Sergio también tiene los pies muy arqueados (pies cavos), anemia ferropénica y una curvatura de la columna vertebral (escoliosis dorsolumbar).</li><br>  </ul><br>  <h4>Tratamiento y medicación</h4><br>  <ul><br>    <li><strong>Medicación:</strong> Sergio toma varios medicamentos, entre ellos Diacomit, Depakine, Noiafren y Fenfluramina para controlar su epilepsia.</li><br>    <li><strong>Suplementos:</strong> También toma suplementos de hierro para tratar su anemia.</li><br>    <li><strong>Terapias:</strong> Participa en fisioterapia, logopedia y educación física adaptada para favorecer su desarrollo y su salud física.</li><br>  </ul><br>  <h4>Otros</h4><br>  <ul><br>    <li>Sergio ha sufrido estados epilépticos, que son ataques prolongados que requieren atención médica inmediata.</li><br>    <li>Tiene una mutación en el gen SCN1A, que está asociada a su epilepsia.</li><br>    <li>Su plan de tratamiento se sigue de cerca y se ajusta según sea necesario para controlar su enfermedad.</li><br>    <li>Sergio requiere atención y seguimiento continuos debido a la gravedad de su epilepsia, que puede incluir emergencias potencialmente mortales como una parada cardiaca.</li><br>  </ul><br>  <p>Es importante que Sergio y sus cuidadores mantengan una comunicación abierta con los profesionales sanitarios para garantizar el mejor tratamiento posible de su enfermedad.</p><br></div>"};
            htmldemo.text = htmldemo.text.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');
            this.jsPDFService.generateResultsPDF(htmldemo.text, this.translate.store.currentLang, qrCodeDataURL)*/
          }

          openFeedback(){
            let url = 'https://surveys.hotjar.com/8c45b969-6087-4b58-82f3-cc496b881117'
            window.open(url, "_blank");
          }

          newSummary(){
            this.summaryPatient = '';
          }

          getLiteral(literal) {
            return this.translate.instant(literal);
        }

        showPanelMedium(content) {
          this.medicalText = '';
          this.summaryDx29 = '';
          if (this.modalReference != undefined) {
              this.modalReference.close();
          }
          let ngbModalOptions: NgbModalOptions = {
              backdrop: 'static',
              keyboard: false,
              windowClass: 'ModalClass-lg'
          };
          this.modalReference = this.modalService.open(content, ngbModalOptions);
      }

      createSummaryDx29(){
            console.log(this.medicalText)
            //this.summaryDx29
            this.callingSummary = true;
            this.context = [];
            let nameFiles = [];
              for (let doc of this.docs) {
                if(doc.state == 'done'){
                  if(doc.summary){
                    this.context.push(doc.summary);
                  }else{
                    this.context.push(doc.medicalText);
                  }
                  //this.context.push(doc.summary);
                  nameFiles.push(doc.dataFile.name);
                }
              }
              if(this.context.length == 0){
                this.callingSummary = false;
                this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
                return;
              }
              this.paramForm = this.myuuid+'/results/'+this.makeid(8)
              var query = { "userId": this.myuuid, "context": this.context, "conversation": this.conversation, paramForm: this.paramForm };
              this.subscription.add(this.http.post(environment.api + '/api/calldxsummary/', query)
                .subscribe(async (res: any) => {
                  if(res.response != undefined){
                    res.response = res.response.replace(/^```html\n|\n```$/g, '');
                    //res.response = res.response.replace(/\\n\\n/g, '<br>');
                    //res.response = res.response.replace(/\n/g, '<br>');
                    res.response = res.response.replace(/\\n\\n/g, '');
                    res.response = res.response.replace(/\n/g, '');
                    this.translateInverseSummaryDx(res.response).catch(error => {
                      console.error('Error al procesar el mensaje:', error);
                      this.insightsService.trackException(error);
                    });
                  }else{
                    this.callingSummary = false;
                    this.toastr.error('', this.translate.instant("generics.error try again"));
                  }
                  

                }, (err) => {
                  this.callingSummary = false;
                  console.log(err);
                  this.insightsService.trackException(err);
                }));
          }


          async translateInverseSummaryDx(msg): Promise<string> {
  return new Promise((resolve, reject) => {
    // Función auxiliar para procesar el contenido de la tabla
              const processTable = (tableContent) => {
                return tableContent.replace(/\n/g, ''); // Eliminar saltos de línea dentro de la tabla
              };
          
              // Función auxiliar para procesar el texto fuera de las tablas
              const processNonTableContent = (text) => {
                return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
              };
          
              if (this.lang != 'en') {
                var jsontestLangText = [{ "Text": msg }]
                this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
                  .subscribe((res2: any) => {
                    if (res2.text != undefined) {
                      msg = res2.text;
                    }
                    
                    // Aquí procesamos el mensaje
                    const parts = msg.split(/(<table>|<\/table>)/); // Divide el mensaje en partes de tabla y no tabla
                    this.summaryDx29 = parts.map((part, index) => {
                      if (index % 4 === 2) { // Los segmentos de tabla estarán en las posiciones 2, 6, 10, etc. (cada 4 desde el segundo)
                        return processTable(part);
                      } else {
                        return processNonTableContent(part);
                      }
                    }).join('');
          
                    this.callingSummary = false;
                    resolve('ok');
                  }, (err) => {
                    console.log(err);
                    this.insightsService.trackException(err);
                    this.summaryDx29 = processNonTableContent(msg);
                    this.callingSummary = false;
                    resolve('ok');
                  }));
              } else {
                this.summaryDx29 = processNonTableContent(msg);
                this.callingSummary = false;
                resolve('ok');
              }
            });
          }

          async translateInverseTranscript(msg): Promise<string> {
            return new Promise((resolve, reject) => {
              // Función auxiliar para procesar el contenido de la tabla
              const processTable = (tableContent) => {
                return tableContent.replace(/\n/g, ''); // Eliminar saltos de línea dentro de la tabla
              };
          
              // Función auxiliar para procesar el texto fuera de las tablas
              const processNonTableContent = (text) => {
                return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
              };
          
              if (this.lang != 'en') {
                var jsontestLangText = [{ "Text": msg }]
                this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
                  .subscribe((res2: any) => {
                    if (res2.text != undefined) {
                      msg = res2.text;
                    }
                    
                    // Aquí procesamos el mensaje
                    const parts = msg.split(/(<table>|<\/table>)/); // Divide el mensaje en partes de tabla y no tabla
                    this.summaryTranscript2 = parts.map((part, index) => {
                      if (index % 4 === 2) { // Los segmentos de tabla estarán en las posiciones 2, 6, 10, etc. (cada 4 desde el segundo)
                        return processTable(part);
                      } else {
                        return processNonTableContent(part);
                      }
                    }).join('');
          
                    this.callingSummary = false;
                    resolve('ok');
                  }, (err) => {
                    console.log(err);
                    this.insightsService.trackException(err);
                    this.summaryTranscript2 = processNonTableContent(msg);
                    this.callingSummary = false;
                    resolve('ok');
                  }));
              } else {
                this.summaryTranscript2 = processNonTableContent(msg);
                this.callingSummary = false;
                resolve('ok');
              }
            });
          }

          removeHtmlTags(html) {
            // Crear un elemento div temporal
            var tempDivElement = document.createElement("div");
            // Asignar el HTML al div
            tempDivElement.innerHTML = html;
            // Usar textContent para obtener el texto plano
            return tempDivElement.textContent || tempDivElement.innerText || "";
        }

        convertHtmlToPlainText(html) {
          // Reemplazar etiquetas <br> y </div> con saltos de línea
          let text = html.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/div>/gi, "\n");
      
          // Crear un elemento div temporal para manejar cualquier otra etiqueta HTML
          var tempDivElement = document.createElement("div");
          tempDivElement.innerHTML = text;
      
          // Obtener texto plano
          return tempDivElement.textContent || tempDivElement.innerText || "";
      }

          copySummaryTranscript(){
            this.clipboard.copy(this.convertHtmlToPlainText(this.summaryTranscript2));
            //this.clipboard.copy(this.summaryTranscript2);
            Swal.fire({
                icon: 'success',
                html: this.translate.instant("messages.Results copied to the clipboard"),
                showCancelButton: false,
                showConfirmButton: false,
                allowOutsideClick: false
            })
            setTimeout(function () {
                Swal.close();
            }, 2000);
        }


          copySummaryDx(){
            this.clipboard.copy(this.convertHtmlToPlainText(this.summaryTranscript2));
            //this.clipboard.copy(this.summaryDx29);
            Swal.fire({
                icon: 'success',
                html: this.translate.instant("messages.Results copied to the clipboard"),
                showCancelButton: false,
                showConfirmButton: false,
                allowOutsideClick: false
            })
            setTimeout(function () {
                Swal.close();
            }, 2000);
        }

        restartSummaryDx(){
          this.summaryDx29 = '';
          this.medicalText = '';
        }

        gotoDxGPT(){
          let url = `https://dxgpt.app/?medicalText=${encodeURIComponent(this.summaryDx29)}`;
          window.open(url, '_blank');
        }

        async entryOpt(opt, content){
          if(opt=='opt1'){
            this.stepPhoto = 1;
            let ngbModalOptions: NgbModalOptions = {
              keyboard: false,
              windowClass: 'ModalClass-sm' // xl, lg, sm
            };
            if (this.modalReference != undefined) {
              this.modalReference.close();
              this.modalReference = undefined;
            }
            this.modalReference = this.modalService.open(content, ngbModalOptions);
            await this.delay(200);
            this.openCamera();
          }
        }

        isMobileDevice(): boolean {
          const userAgent = navigator.userAgent || navigator.vendor;
          return /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
        }

        openCamera() {
          const videoElement = document.querySelector('#videoElement') as HTMLVideoElement;
          if (videoElement) {
            let params = {
              video: {
                facingMode: 'user'
              }
            }
            if (this.isMobileDevice()) {
              params = {
                video: {
                  facingMode: 'environment'
                }
              }
            }
            navigator.mediaDevices.getUserMedia(params)
              .then(stream => {
                videoElement.srcObject = stream;
              })
              .catch(err => {
                console.error("Error accessing camera:", err);
                //debe permitir la camara para continuar
                this.toastr.error('', 'You must allow the camera to continue. Please enable camera access in your browser settings and try again.');
                if (this.modalReference != undefined) {
                  this.modalReference.close();
                  this.modalReference = undefined;
                }
              });
          } else {
            console.error("Video element not found");
            this.toastr.error('', this.translate.instant("generics.error try again"));
          }
        }

        captureImage() {
          const videoElement = document.querySelector('#videoElement') as HTMLVideoElement;
          if (videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
            this.capturedImage = canvas.toDataURL('image/png');
            this.stopCamera();
            this.stepPhoto = 2;
          } else {
            console.error("Video element not ready for capture.");
          }
        }

        stopCamera() {
          const videoElement = document.querySelector('#videoElement') as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const tracks = stream.getTracks();
        
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
          }
        }

        async prevCamera(){
          this.stepPhoto = 1;
          await this.delay(200);
          this.openCamera();
          this.capturedImage = '';
        }

        finishPhoto(){
          if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
          }
          // Limpiar el array de documentos antes de agregar uno nuevo
          this.docs = [];
          //add file to docs
          let file = this.dataURLtoFile(this.capturedImage, 'photo.png');
          var reader = new FileReader();
          reader.readAsArrayBuffer(file); // read file as data url
          this.docs.push({ dataFile: { event: file, name: file.name, url: file.name, content: this.capturedImage }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
          let index = this.docs.length - 1;
          this.prepareFile(index);
        }

        //create dataURLtoFile
        dataURLtoFile(dataurl, filename) {
          var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
              bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], filename, {type:mime});
        }

        createFile(){
          //from this.medicalText create a txt file and add to docs
          //est the name with the date
          let today = new Date();
          let dd = today.getDate();
          let mm = today.getMonth()+1;
          let yyyy = today.getFullYear();
          let hh = today.getHours();
          let min = today.getMinutes();
          let sec = today.getSeconds();
          let ms = today.getMilliseconds();
          let date = dd+mm+yyyy+hh+min+sec+ms;
          let fileName = 'manualFile-'+date+'.txt';
          if(this.lang == 'es'){
            fileName = 'informeManual-'+date+'.txt';
          }
          
          let file = new File([this.medicalText], fileName, {type: 'text/plain'});
          var reader = new FileReader();
          reader.readAsArrayBuffer(file); // read file as data url
          this.docs.push({ dataFile: { event: file, name: file.name, url: file.name, content: this.medicalText }, langToExtract: '', medicalText: this.medicalText, state: 'done', tokens: 0 });
          if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
          }
        }

        toggleFilters() {
          this.showFilters = !this.showFilters;
        }

        useSampleText() {
          
          this.medicalText = `Paciente: Juan Pérez
            Fecha de nacimiento: 15/03/1980
            ID del Paciente: JP19800315

            1. Antecedentes Clínicos:
            El paciente presenta un historial de cardiomiopatía dilatada (CMD) y antecedentes familiares de miocardiopatías y arritmias. Se ha observado una progresión de los síntomas, incluyendo fatiga, disnea y episodios de síncope.

            2. Objetivo del Estudio:
            Identificar variantes genéticas potencialmente patogénicas que puedan estar relacionadas con la condición clínica del paciente, enfocándose en genes asociados con cardiomiopatías.

            3. Metodología:
            Se realizó una secuenciación completa del exoma (WES) utilizando la plataforma de secuenciación de nueva generación (NGS). Los datos obtenidos fueron analizados para identificar variantes en genes relacionados con cardiomiopatías, utilizando bases de datos de referencia y herramientas bioinformáticas para predecir la patogenicidad de las variantes encontradas.

            4. Resultados:

            A. Variantes Identificadas:

            Gen TTN:
            - Variante: c.80248_80251del (p.Ser26750Cysfs*12)
            - Tipo: Deleción de nucleótidos
            - Clasificación: Patogénica
            - Descripción: Esta variante causa una interrupción en la lectura del marco del gen TTN, resultando en una proteína truncada. Las mutaciones en TTN están asociadas con cardiomiopatía dilatada autosómica dominante.

            Gen MYH7:
            - Variante: c.742G>A (p.Arg248His)
            - Tipo: Cambio de sentido
            - Clasificación: Probablemente patogénica
            - Descripción: Esta variante missense afecta un residuo altamente conservado en la cabeza de la cadena pesada de la miosina beta-cardiaca. Las mutaciones en MYH7 están implicadas en diversas formas de miocardiopatía.

            Gen LMNA:
            - Variante: c.1588C>T (p.Arg530Cys)
            - Tipo: Cambio de sentido
            - Clasificación: De significancia incierta
            - Descripción: Esta variante se encuentra en una región crítica del gen LMNA, que codifica la proteína lamin A/C. Las mutaciones en LMNA pueden causar una variedad de enfermedades, incluyendo cardiomiopatías y distrofias musculares. Sin embargo, la patogenicidad exacta de esta variante específica aún no está claramente establecida.

            5. Conclusiones:
            Las variantes patogénicas identificadas en los genes TTN y MYH7 son probablemente responsables de la cardiomiopatía dilatada observada en el paciente. La variante en LMNA requiere más investigación para determinar su relevancia clínica.

            6. Recomendaciones:
            - Evaluación Clínica: Se recomienda una evaluación clínica detallada de los familiares del paciente para identificar posibles portadores de las variantes patogénicas.
            - Consejería Genética: Se sugiere que el paciente y sus familiares reciban consejería genética para discutir los resultados y sus implicaciones.
            - Seguimiento Médico: Se aconseja un seguimiento regular con un cardiólogo especializado en enfermedades genéticas.

            Firmado por:
            Dr. Ana Gómez, Genetista
            Fecha: 10/05/2024`;
        }

        showPanelTranslate(content) {
          if (this.modalReference != undefined) {
              this.modalReference.close();
          }
          this.loadAllLanguages();
          let ngbModalOptions: NgbModalOptions = {
              backdrop: 'static',
              keyboard: false,
              windowClass: 'ModalClass-xl'// xl, lg, sm
          };
          this.modalReference = this.modalService.open(content, ngbModalOptions);
      }

      loadAllLanguages() {
        this.allLangs = [];
        this.subscription.add( this.langService.getAllLangs()
        .subscribe( (res : any) => {
          console.log(res)
          this.allLangs=res;
        }));
    }

    async translateText(){
      if(this.summaryPatient == ''){
        this.toastr.error('', this.translate.instant("demo.No text to translate"));
        return;
      }
      this.callingTranslate = true;
      var deepl_code = await this.getDeeplCode(this.selectedLanguage.code);
      if (deepl_code == null) {
        var testLangText = this.summaryPatient .substr(0, 4000)
        this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          let jsontestLangText = [{ "Text": this.summaryPatient }]
          this.subscription.add(this.apiDx29ServerService.getTranslationSegmentsInvert(res[0].language, this.selectedLanguage.code,jsontestLangText)
          .subscribe( (res2 : any) => {
              
              if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                      res2[0].translations[0].text = res2[0].translations[0].text.replace(/^```html\n|\n```$/g, '');
                      res2[0].translations[0].text = res2[0].translations[0].text.replace(/\\n\\n/g, '');
                      res2[0].translations[0].text = res2[0].translations[0].text.replace(/\n/g, '');
                    this.translatedText = res2[0].translations[0].text;
                  }else{
                    console.log(res2)
                    //mostrar en un swal que no se pudo traducir, The target language is not valid. que pruebe con la opcion de traducir con IA
                    Swal.fire({
                      icon: 'error',
                      title: this.translate.instant("demo.The target language is not valid. Try the option to translate with AI."),
                      showCancelButton: false,
                      showConfirmButton: true,
                      allowOutsideClick: false
                   })

                  }
              }else{
                console.log(res2)
                Swal.fire({
                  icon: 'error',
                  title: this.translate.instant("demo.The target language is not valid. Try the option to translate with AI."),
                  showCancelButton: false,
                  showConfirmButton: true,
                  allowOutsideClick: false
               })
              }
              this.callingTranslate = false;
    
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            this.callingTranslate = false;
          }));
        }, (err) => {
          this.insightsService.trackException(err);
          console.log(err);
          this.callingTranslate = false;
      }));
      }else{
        var jsontestLangText = [{ "Text": this.summaryPatient  }]
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.selectedLanguage.code, jsontestLangText )
        .subscribe((res2: any) => {
          console.log(res2)
          if (res2.text != undefined) {
            res2.text = res2.text.replace(/^```html\n|\n```$/g, '');
            res2.text = res2.text.replace(/\\n\\n/g, '');
            res2.text = res2.text.replace(/\n/g, '');
            this.translatedText = res2.text;
          }
          this.callingTranslate = false;
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.callingTranslate = false;
        }));
      }
     
    }

    async translateTextIA(){
      if(this.summaryPatient == ''){
        this.toastr.error('', this.translate.instant("demo.No text to translate"));
        return;
      }
      this.callingTranslate = true;

      this.subscription.add(this.apiDx29ServerService.getIATranslation(this.selectedLanguage.name, this.summaryPatient )
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            res2.text = res2.text.replace(/^```html\n|\n```$/g, '');
            res2.text = res2.text.replace(/\\n\\n/g, '');
            res2.text = res2.text.replace(/\n/g, '');
            this.translatedText = res2.text;
          }
          this.callingTranslate = false;
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.callingTranslate = false;
        }));
     
    }

    getDeeplCode(msCode) {
      return this.langDict[msCode] || null;
    }

    changeLanguage(){
      this.translatedText = '';
    }
        

    async closeModalTranslate() {
      this.translatedText = '';
      this.selectedLanguage = {"code":"en","name":"English","nativeName":"English"};
      if (this.modalReference != undefined) {
        this.modalReference.close();
        this.modalReference = undefined;
      }
    }


    async toggleEdit(content: TemplateRef<any>) {
      this.originalContent = this.summaryPatient;
      this.editedContent = this.summaryPatient; 
  
      let ngbModalOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: false,
        windowClass: 'ModalClass-xl' // xl, lg, sm
      };
  
      this.modalReference = this.modalService.open(content, ngbModalOptions);
      await this.delay(500);
      setTimeout(() => {
        const modalElement = document.getElementById('editableDiv');
        if (modalElement) {
          this.editableDiv = new ElementRef(modalElement);
        }
      }, 0);

  

    }

    toggleCriteria(trial: any) {
      // Alternar la visibilidad
      trial.showCriteria = !trial.showCriteria;
    
      // Sólo si lo vamos a "abrir" y aún no hay structuredCriteria cargado,
      // hacemos la llamada al backend.
      if (trial.showCriteria && !trial.structuredCriteria) {
        trial.isLoadingCriteria = true; // Indicamos que comienza la carga

        const body = {
          text: trial.ParticipationCriteria,
          language: this.detectedLang || 'en'  // El idioma que corresponda
        };

        this.http.post(environment.api + '/api/trialEligibility', body)
          .subscribe(
            (res: any) => {
              // Filtramos por si vienen strings vacíos
              const inc = Array.isArray(res.inclusion) ? res.inclusion.filter((c: string) => c.trim().length > 0) : [];
              const exc = Array.isArray(res.exclusion) ? res.exclusion.filter((c: string) => c.trim().length > 0) : [];

              trial.structuredCriteria = {
                inclusion: inc,
                exclusion: exc
              };
            },
            (err) => {
              console.error('Error al obtener criterios', err);
              // Podrías notificar un error al usuario o hacer un fallback
            },
            () => {
              // Cuando finaliza la llamada (ya sea OK o error),
              // marcamos como finalizada la carga
              trial.isLoadingCriteria = false;
            }
          );
      }
    }
}
