import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { PerfectScrollbarModule } from "ngx-perfect-scrollbar";
import { ClickOutsideModule } from 'ng-click-outside';

import { PipeModule } from 'app/shared/pipes/pipe.module';
import {FirstCharacterDotPipe} from 'app/shared/pipes/first-character-dot.pipe';
import {FirstCharacterHyphenPipe} from 'app/shared/pipes/first-character-hyphen.pipe';

import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';

//COMPONENTS
import { NavbarD29Component } from "./navbar-dx29/navbar-dx29.component";
import { HorizontalMenuComponent } from './horizontal-menu/horizontal-menu.component';
import { VerticalMenuComponent } from "./vertical-menu/vertical-menu.component";
import { CustomizerComponent } from './customizer/customizer.component';
import { SafePipe } from 'app/shared/services/safe.pipe';

//DIRECTIVES
import { SidebarLinkDirective } from './directives/sidebar-link.directive';
import { SidebarDropdownDirective } from './directives/sidebar-dropdown.directive';
import { SidebarAnchorToggleDirective } from './directives/sidebar-anchor-toggle.directive';
import { SidebarDirective } from './directives/sidebar.directive';
import { TopMenuDirective } from './directives/topmenu.directive';
import { TopMenuLinkDirective } from './directives/topmenu-link.directive';
import { TopMenuDropdownDirective } from './directives/topmenu-dropdown.directive';
import { TopMenuAnchorToggleDirective } from './directives/topmenu-anchor-toggle.directive';




@NgModule({
    exports: [
        CommonModule,
        NavbarD29Component,
        VerticalMenuComponent,
        HorizontalMenuComponent,
        CustomizerComponent,
        SidebarDirective,
        TopMenuDirective,
        NgbModule,
        TranslateModule,
        SafePipe,
        FirstCharacterDotPipe,
        FirstCharacterHyphenPipe
    ],
    imports: [
        RouterModule,
        CommonModule,
        NgbModule,
        TranslateModule,
        FormsModule,
        OverlayModule,
        ReactiveFormsModule ,
        PerfectScrollbarModule,
        ClickOutsideModule,
        PipeModule,
        MatDatepickerModule,
        MatInputModule,
        MatNativeDateModule
    ],
    declarations: [
        NavbarD29Component,
        VerticalMenuComponent,
        HorizontalMenuComponent,
        CustomizerComponent,
        SidebarLinkDirective,
        SidebarDropdownDirective,
        SidebarAnchorToggleDirective,
        SidebarDirective,
        TopMenuLinkDirective,
        TopMenuDropdownDirective,
        TopMenuAnchorToggleDirective,
        TopMenuDirective,
        SafePipe,
        FirstCharacterDotPipe,
        FirstCharacterHyphenPipe
    ]
})
export class SharedModule { }
