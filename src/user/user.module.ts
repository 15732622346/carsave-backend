import { Module } from '@nestjs/common';
import { UserService } from './user.service';
// import { TypeOrmModule } from '@nestjs/typeorm'; // 未来会用到
// import { User } from '../database/entities/user.entity'; // 未来会用到

@Module({
  // imports: [TypeOrmModule.forFeature([User])], // 未来会用到
  providers: [UserService],
  exports: [UserService] // 导出 UserService 以便 AuthModule 可以使用
})
export class UserModule {} 