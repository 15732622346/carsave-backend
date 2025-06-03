import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
// import { Repository } from 'typeorm'; // 未来会用到
// import { InjectRepository } from '@nestjs/typeorm'; // 未来会用到

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.logger.log('UserService initialized.');
  }

  async findByOpenid(openid: string): Promise<User | null> {
    this.logger.log(`UserService: Searching for user with openid: ${openid}`);
    const user = await this.userRepository.findOne({ where: { openid } });
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

    const newUserEntity = this.userRepository.create({
      openid,
      nickName: userData?.nickName, // 如果没有提供，则为 null (符合实体定义)
      avatarUrl: userData?.avatarUrl, // 如果没有提供，则为 null
      // unionid 和其他字段会是其默认值或 null
    });

    const savedUser = await this.userRepository.save(newUserEntity);
    this.logger.log(
      `UserService: New user created successfully with id: ${savedUser.id} and openid: ${savedUser.openid}`,
    );
    return savedUser;
  }

  // 新增 findById 方法
  async findById(id: number): Promise<User | null> {
    this.logger.log(`UserService: Searching for user with id: ${id}`);
    const user = await this.userRepository.findOne({ where: { id } });
    if (user) {
      this.logger.log(`UserService: User found by id: ${id}`);
    } else {
      this.logger.log(`UserService: User not found by id: ${id}`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`UserService: Searching for user with email: ${email}`);
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      this.logger.log(`UserService: User found by email: ${email}`);
    } else {
      this.logger.log(`UserService: User not found by email: ${email}`);
    }
    return user;
  }

  async createWithEmail(email: string, password: string): Promise<User> {
    this.logger.log(`UserService: Creating new user with email: ${email}`);
    // 生成8位uuid作为openid
    const openid = uuidv4().replace(/-/g, '').slice(0, 8);
    const newUserEntity = this.userRepository.create({
      email,
      password,
      openid,
    });
    const savedUser = await this.userRepository.save(newUserEntity);
    this.logger.log(
      `UserService: New user created successfully with id: ${savedUser.id} and email: ${savedUser.email}`,
    );
    return savedUser;
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { resetToken: token } });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async saveResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await this.userRepository.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }

  async clearResetToken(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });
  }

  async saveResetCode(userId: number, code: string, expiry: Date): Promise<void> {
    await this.userRepository.update(userId, {
      resetCode: code,
      resetCodeExpiry: expiry,
    });
  }

  async findByEmailAndResetCode(email: string, code: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email, resetCode: code } });
  }

  async clearResetCode(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      resetCode: undefined,
      resetCodeExpiry: undefined,
    });
  }

  // 其他用户相关方法可以加在这里...
}
