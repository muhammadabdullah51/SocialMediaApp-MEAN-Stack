import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  message: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  signup() {
    console.log('Form Data:', {
      username: this.username,
      email: this.email,
      password: this.password
    });

    this.authService.signup({ username: this.username, email: this.email, password: this.password }).subscribe(
      response => {
        this.message = response.message;
        console.log('Signup Response:', response);
        this.router.navigate(['/login']);
      },
      error => {
        console.error('Signup Error:', error);
        this.message = error.error.message || 'An error occurred during signup';
      }
    );
  }
}
