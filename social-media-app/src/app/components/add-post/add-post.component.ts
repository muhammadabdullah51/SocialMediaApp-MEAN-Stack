import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-add-post',
  templateUrl: './add-post.component.html',
  styleUrls: ['./add-post.component.css']
})
export class AddPostComponent {
  title: string = '';
  description: string = '';
  image: File | null = null;
  message: string = '';

  constructor(private postService: PostService, private router: Router) {}

  onFileChange(event: any) {
    this.image = event.target.files[0];
  }

  addPost() {
    if (!this.title || !this.description || !this.image) {
      this.message = 'All fields are required';
      return;
    }

    const formData = new FormData();
    formData.append('title', this.title);
    formData.append('description', this.description);
    formData.append('image', this.image);

    this.postService.addPost(formData).subscribe(
      response => {
        this.message = 'Post added successfully';
        this.router.navigate(['/posts']);
      },
      error => {
        console.error('Error adding post:', error);
        this.message = 'Error adding post';
      }
    );
  }
}
