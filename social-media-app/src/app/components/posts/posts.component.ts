import { Component, OnInit } from '@angular/core';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css']
})
export class PostsComponent implements OnInit {
  posts: any[] = [];
  selectedPost: any = null;
  userId: string = '';

  constructor(private postService: PostService, private authService: AuthService, private socketService: SocketService) {
    const token = this.authService.getToken();
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userId = payload.id;
  }

  ngOnInit(): void {
    this.fetchPosts();

    this.socketService.onUpdatePost().subscribe((updatedPost: any) => {
      const index = this.posts.findIndex(post => post._id === updatedPost._id);
      if (index !== -1) {
        this.posts[index] = updatedPost;
      }
    });
  }

  fetchPosts(): void {
    this.postService.getPosts().subscribe(
      response => {
        this.posts = response.posts.reverse();  // Reverse the order of the posts
      },
      error => {
        console.error('Error fetching posts:', error);
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

  toggleLike(postId: string): void {
    this.socketService.toggleLike(postId, this.userId);
  }

  commentPost(postId: string, comment: string): void {
    this.socketService.commentPost(postId, this.userId, comment);
  }

  replyComment(postId: string, commentId: string, reply: string): void {
    this.socketService.replyComment(postId, commentId, this.userId, reply);
  }

  hasLiked(post: any): boolean {
    return post.likes.some((like: any) => like.user._id === this.userId);
  }

  showReplyInput(commentId: string): void {
    const comment = this.posts.flatMap(post => post.comments).find(comment => comment._id === commentId);
    if (comment) {
      comment.showReply = !comment.showReply;
    }
  }
}
