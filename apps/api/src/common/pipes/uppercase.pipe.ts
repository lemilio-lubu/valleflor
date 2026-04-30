import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class UppercasePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string') return value;
    return value.toUpperCase().trim();
  }
}
