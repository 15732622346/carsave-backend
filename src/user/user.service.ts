import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
// import { Repository } from 'typeorm'; // 未来会用到
// import { InjectRepository } from '@nestjs/typeorm'; // 未来会用到

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.logger.log('UserService initialized.');
  }

  async findByOpenid(openid: string): Promise<User | null> {
    this.logger.log(`UserService: Searching for user with openid: ${openid}`);
    const user = await this.usersRepository.findOne({ where: { openid } });
    if (user) {
      this.logger.log(`UserService: User found by openid: ${openid}`);
    } else {
      this.logger.log(`UserService: User not found by openid: ${openid}`);
    }
    return user;
  }

  async createWithOpenid(
    openid: string,
    sessionKey?: string,
    userData?: Partial<User>,
  ): Promise<User> {
    this.logger.log(`UserService: Creating new user with openid: ${openid}`);
    // sessionKey 暂时不存入数据库，如果需要，User 实体需要对应字段
    // userData 可以包含 nickname, avatarUrl 等，如果小程序在登录时能获取到并传递过来

    const newUserEntity = this.usersRepository.create({
      openid,
      nickName: userData?.nickName, // 如果没有提供，则为 null (符合实体定义)
      avatarUrl: userData?.avatarUrl, // 如果没有提供，则为 null
      // unionid 和其他字段会是其默认值或 null
    });

    const savedUser = await this.usersRepository.save(newUserEntity);
    this.logger.log(
      `UserService: New user created successfully with id: ${savedUser.id} and openid: ${savedUser.openid}`,
    );
    return savedUser;
  }

  // 新增 findById 方法
  async findById(id: number): Promise<User | null> {
    this.logger.log(`UserService: Searching for user with id: ${id}`);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      this.logger.log(`UserService: User found by id: ${id}`);
    } else {
      this.logger.log(`UserService: User not found by id: ${id}`);
    }
    return user;
  }

  // 其他用户相关方法可以加在这里...
}
