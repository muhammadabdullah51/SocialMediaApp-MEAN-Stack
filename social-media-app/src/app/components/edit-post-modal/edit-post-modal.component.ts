  import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
  import { PostService } from '../../services/post.service';

  @Component({
    selector: 'app-edit-post-modal',
    templateUrl: './edit-post-modal.component.html',
    styleUrls: ['./edit-post-modal.component.css']
  })
  export class EditPostModalComponent implements OnInit {
    @Input() post: any;
    @Output() postUpdated = new EventEmitter<void>();
    @Output() postDeleted = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();

    title: string = '';
    description: string = '';
    image: File | null = null;

    constructor(private postService: PostService) {}

    // ngOnChanges(changes: SimpleChanges) {
    //   if (changes['post'] && changes['post'].currentValue) {
    //     this.title = this.post.title;
    //     this.description = this.post.description;
    //   }
    // }
    ngOnInit() {
      this.title = this.post.title;
      this.description = this.post.description;
    }

    onFileChange(event: any) {
      this.image = event.target.files[0];
    }

    updatePost() {
      const formData = new FormData();
      formData.append('title', this.title);
      formData.append('description', this.description);
      if (this.image) {
        formData.append('image', this.image);
      }
  
      this.postService.updatePost(this.post._id, formData).subscribe(
        response => {
          this.postUpdated.emit();
        },
        error => {
          console.error('Error updating post:', error);
        }
      );
    }
  
    deletePost() {
      this.postService.deletePost(this.post._id).subscribe(
        response => {
          this.postDeleted.emit();
        },
        error => {
          console.error('Error deleting post:', error);
        }
      );
    }
  
    closeModal() {
      this.close.emit();
    }

    // updatePost() {
    //   const formData = new FormData();
    //   formData.append('title', this.title);
    //   formData.append('description', this.description);
    //   if (this.image) {
    //     formData.append('image', this.image);
    //   }

    //   this.postService.updatePost(this.post._id, formData).subscribe(
    //     response => {
    //       this.postUpdated.emit();
    //       this.close.emit();
    //     },
    //     error => {
    //       console.error('Error updating post:', error);
    //     }
    //   );
    // }

    // deletePost() {
    //   this.postService.deletePost(this.post._id).subscribe(
    //     response => {
    //       this.postDeleted.emit();
    //       this.close.emit();
    //     },
    //     error => {
    //       console.error('Error deleting post:', error);
    //     }
    //   );
    // }

    // closeModal() {
    //   this.close.emit();
    // }
  }
