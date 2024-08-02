import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  onUpdatePost(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('updatePost', (data) => {
        observer.next(data);
      });
    });
  }

  toggleLike(postId: string, userId: string): void {
    this.socket.emit('toggleLike', { postId, userId });
  }

  commentPost(postId: string, userId: string, comment: string): void {
    this.socket.emit('commentPost', { postId, userId, comment });
  }

  replyComment(postId: string, commentId: string, userId: string, reply: string): void {
    this.socket.emit('replyComment', { postId, commentId, userId, reply });
  }
}
