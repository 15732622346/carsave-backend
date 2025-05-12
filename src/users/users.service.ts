import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findUserByOpenidForAuth(openid: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { openid } });
    return user === null ? undefined : user;
  }

  async wechatLogin(code: string): Promise<{ access_token: string; user: Partial<User> }> {
    this.logger.log(`服务层开始处理微信登录，code: ${code}`);

    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

    if (!appId || !appSecret) {
      this.logger.error('微信配置缺失：WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置');
      throw new Error('微信登录配置错误');
    }

    this.logger.log('开始请求微信接口获取 openid');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await axios.get<{ 
        openid?: string;
        session_key?: string;
        unionid?: string;
        errcode?: number;
        errmsg?: string;
      }>(url);
      
      this.logger.debug(`微信接口返回数据: ${JSON.stringify(response.data)}`);
      const { openid, session_key, unionid, errcode, errmsg } = response.data;

      if (errcode) {
        this.logger.error(`微信接口返回错误：${errmsg} (错误码: ${errcode})`);
        throw new Error(`微信登录失败: ${errmsg}`);
      }

      if (!openid) {
        this.logger.error('微信接口未返回 openid');
        throw new Error('微信登录失败：未获取到 openid');
      }

      this.logger.log(`开始查找用户，openid: ${openid}`);
      let user = await this.userRepository.findOne({ where: { openid } });

      if (!user) {
        this.logger.log(`未找到用户，创建新用户，openid: ${openid}`);
        const newUser = this.userRepository.create({
          openid,
          unionid,
        });
        user = await this.userRepository.save(newUser);
        this.logger.log(`新用户创建成功，ID: ${user.id}`);
      } else {
        this.logger.log(`找到现有用户，ID: ${user.id}`);
        if (unionid && !user.unionid) {
          this.logger.log(`更新用户 unionid: ${unionid}`);
          user.unionid = unionid;
          await this.userRepository.save(user);
        }
      }

      const payload = { openid: user.openid };
      const accessToken = this.jwtService.sign(payload);
      this.logger.log(`生成 JWT token 成功，用户 ID: ${user.id}`);

      const { id, nickname, avatar_url } = user;
      return {
        access_token: accessToken,
        user: { id, openid: user.openid, nickname, avatar_url },
      };

    } catch (error) {
      this.logger.error(`微信登录处理失败: ${error.message}`, error.stack);
      if (axios.isAxiosError(error)) {
        throw new Error(`微信接口请求失败: ${error.response?.status} ${error.response?.data?.errmsg || error.message}`);
      }
      throw error;
    }
  }
}
