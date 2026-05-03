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

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
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

  /**
   * 특정 Room을 나감 (범용)
   */
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

  /**
   * 특정 Room에 있는 모든 사용자에게 이벤트 전송 (범용)
   * 서비스 레이어에서 주입받아 실시간 알림을 보낼 때 사용합니다.
   */
  sendToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
  }
}
