import { DeviceContext } from '../dto/device-context';

export interface ChangeAdminPasswordCommand {
  adminUserId: string;
  currentPassword: string;
  newPassword: string;
  device: DeviceContext;
}
