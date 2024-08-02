import { Component, OnInit } from '@angular/core';
import { PostService } from '../../services/post.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-user-posts',
  templateUrl: './user-posts.component.html',
  styleUrls: ['./user-posts.component.css']
})
export class UserPostsComponent implements OnInit {
  posts: any[] = [];
  selectedPost: any = null;



  constructor(private postService: PostService, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchPosts()
  }

  fetchPosts():void{
    this.postService.getUserPosts().subscribe(
      response => {
        this.posts = response.posts;
      },
      error => {
        console.error('Error fetching user posts:', error);
      }
    );
  }

  isPostOwner(post: any): boolean {
    const token = this.authService.getToken();
    const payload = JSON.parse(atob(token.split('.')[1]));
    return post.user._id === payload.id;
  }
  openEditModal(post: any): void {
    this.selectedPost = post;
  }

  closeEditModal(): void {
    this.selectedPost = null;
    this.fetchPosts();
  }
}
