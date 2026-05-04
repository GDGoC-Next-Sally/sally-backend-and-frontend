import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { SupabaseService } from '../../providers/supabase/supabase.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('EventsGateway');

  private userSocketMap: Map<string, Socket> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      // 1. 토큰가져오기
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      // 2. 토큰 검증
      const { data: { user }, error } = await this.supabaseService.getClient().auth.getUser(token);
      if (error || !user) {
        client.disconnect();
        return;
      }
      const userId = user.id;

      // 3. Map에 저장
      this.userSocketMap.set(userId, client);
      this.logger.log(`User ${userId} 접속 완료 (Socket: ${client.id})`);

      // 4. 이 유저가 선생님이거나 학생으로 속한 모든 클래스 검색
      const userClasses = await this.prisma.classes.findMany({
        where: {
          OR: [
            { teacher_id: userId },
            { takes: { some: { student_id: userId } } },
          ],
        },
        select: { id: true }
      });

      // 5. 해당 클래스들의 Room에 모두 입장
      userClasses.forEach(c => {
        client.join(`class:${c.id}`);
      });
      this.logger.log(`User ${userId} joined ${userClasses.length} class rooms.`);

    } catch (err) {
      this.logger.error('Connection failed', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socket] of this.userSocketMap.entries()) {
      if (socket.id === client.id) {
        this.userSocketMap.delete(userId);
        this.logger.log(`User ${userId} 접속 종료`);
        break;
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 특정 Room에 입장 (범용)
   * 클라이언트가 'join_room' 이벤트를 { room: "class:123" }와 함께 보내면 실행됩니다.
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (!data.room) return { error: 'Room name is required' };

    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);

    return { event: 'joined', room: data.room };
  }

  
  // 특정 Room을 나감 (범용)
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (!data.room) return { error: 'Room name is required' };

    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);

    return { event: 'left', room: data.room };
  }

  // 실시간 채팅 테스트용 (범용)
  @SubscribeMessage('chat_message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; message: string },
  ) {
    if (!data.room || !data.message) return { error: 'Room and message are required' };

    // 해당 방에 있는 모두에게 메시지 브로드캐스트
    this.server.to(data.room).emit('chat_message', {
      sender: client.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
    this.logger.log(`Chat from ${client.id} in ${data.room}: ${data.message}`);
  }

  /**
   * 특정 Room에 있는 모든 사용자에게 이벤트 전송 (범용)
   * 서비스 레이어에서 주입받아 실시간 알림을 보낼 때 사용합니다.
   */
  sendToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
    this.logger.log(`Sent event ${event} to room ${room}`);
  }

  
  // 특정 유저(userId)에게만 1:1 이벤트 전송
  sendToUser(userId: string, event: string, payload: any) {
    const socket = this.userSocketMap.get(userId);
    if (socket) {
      socket.emit(event, payload);
      this.logger.log(`Sent event ${event} to user ${userId}`);
    }
    else this.logger.warn(`User ${userId} is not connected.`);
  }

  // 특정 방 삭제
  deleteRoom(roomName: string) {
    this.server.socketsLeave(roomName);
    this.logger.log(`Deleted room ${roomName}`);
  }

  // 특정 유저를 강제로 방에 넣는 함수
  forceJoinRoom(userId: string, roomName: string) {
    const socket = this.userSocketMap.get(userId);
    if (socket) socket.join(roomName);
  }

  // 특정 유저를 강제로 방에서 빼는 함수
  forceLeaveRoom(userId: string, roomName: string) {
    const socket = this.userSocketMap.get(userId);
    if (socket) socket.leave(roomName);
  }
}
