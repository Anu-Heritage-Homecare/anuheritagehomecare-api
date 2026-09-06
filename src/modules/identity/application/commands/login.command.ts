import { DeviceContext } from '../dto/device-context';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
  readonly device: DeviceContext;
}
