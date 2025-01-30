import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ParamService {
  private paramSource = new BehaviorSubject<string>(null);
  currentParam = this.paramSource.asObservable();
  

  constructor(private router: Router, private route: ActivatedRoute) { }

  changeParam(param: string) {
    this.paramSource.next(param);
    let queryParams = { 'my': param }; // replace 'Chat' with your desired value
    this.router.navigate(
      [], 
      {
        relativeTo: this.route,
        queryParams: queryParams,  
        queryParamsHandling: 'merge' // preserve the current parameters
      });
  }
}
