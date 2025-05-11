import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { error } from 'console';
import { async } from 'rxjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find();
  }
  
  async findUser(data: { uid: string}) {
    let user = await this.repo.findOne({ where: { firebaseUid: data.uid } });
    if (user) {
      return user;
    }
    throw new NotFoundException('Користувача не знайдено');
  }
}

