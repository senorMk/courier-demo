import { Component, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import {
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { fuseAnimations } from "@fuse/animations";
import { FuseAlertComponent, FuseAlertType } from "@fuse/components/alert";
import { AuthService } from "app/core/auth/auth.service";
import { ParcelTrackingService, ParcelTrackingInfo } from "../parcel-tracking.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "auth-sign-in",
  templateUrl: "./sign-in.component.html",
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations,
  imports: [
    CommonModule,
    RouterLink,
    FuseAlertComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
  ],
})
export class AuthSignInComponent implements OnInit {
  @ViewChild("signInNgForm") signInNgForm: NgForm;

  alert: { type: FuseAlertType; message: string } = {
    type: "success",
    message: "",
  };
  signInForm: UntypedFormGroup;
  trackingForm: UntypedFormGroup;
  showAlert: boolean = false;

  // Parcel tracking properties
  trackingAlert: { type: FuseAlertType; message: string } = {
    type: "success",
    message: "",
  };
  showTrackingAlert: boolean = false;
  parcelInfo: ParcelTrackingInfo | null = null;
  isTrackingLoading: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private _activatedRoute: ActivatedRoute,
    private _authService: AuthService,
    private _formBuilder: UntypedFormBuilder,
    private _router: Router,
    private _parcelTrackingService: ParcelTrackingService
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Create the sign-in form
    this.signInForm = this._formBuilder.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
      rememberMe: [""],
    });

    // Create the tracking form
    this.trackingForm = this._formBuilder.group({
      trackingNumber: ["", [Validators.required]],
    });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Sign in
   */
  signIn(): void {
    // Return if the form is invalid
    if (this.signInForm.invalid) {
      return;
    }

    // Disable the form
    this.signInForm.disable();

    // Hide the alert
    this.showAlert = false;

    // Sign in
    this._authService.signIn(this.signInForm.value).subscribe(
      (response) => {
        // Set the redirect url.
        // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
        // to the correct page after a successful sign in. This way, that url can be set via
        // routing file and we don't have to touch here.
        const redirectURL =
          this._activatedRoute.snapshot.queryParamMap.get("redirectURL") ||
          "/signed-in-redirect";

        // Navigate to the redirect url
        this._router.navigateByUrl(redirectURL);
      },
      (error) => {
        // Re-enable the form
        this.signInForm.enable();

        // Reset the form
        this.signInNgForm.resetForm();

        // Set the alert
        this.alert = {
          type: "error",
          message: "Wrong email or password",
        };

        // Show the alert
        this.showAlert = true;
      }
    );
  }

  /**
   * Track parcel
   */
  trackParcel(): void {
    // Return if the form is invalid
    if (this.trackingForm.invalid) {
      return;
    }

    // Set loading state
    this.isTrackingLoading = true;
    this.showTrackingAlert = false;
    this.parcelInfo = null;

    // Track the parcel
    this._parcelTrackingService
      .trackParcel(this.trackingForm.get('trackingNumber').value)
      .subscribe(
        (response) => {
          this.isTrackingLoading = false;
          this.parcelInfo = response;
        },
        (error) => {
          this.isTrackingLoading = false;
          this.trackingAlert = {
            type: 'error',
            message: 'Parcel not found. Please check your tracking number and try again.',
          };
          this.showTrackingAlert = true;
        }
      );
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Format status text
   */
  formatStatusText(status: string): string {
    switch (status) {
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'DELIVERED':
        return 'Delivered';
      case 'PENDING':
        return 'Pending';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
