import { DeviceContext } from '../dto/device-context';

export interface AdminLoginCommand {
  email: string;
  password: string;
  device: DeviceContext;
}
