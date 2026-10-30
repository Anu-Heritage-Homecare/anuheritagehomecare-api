import { Entity } from '@shared/domain/entity.base';
import { EmergencyProtocolStep } from './emergency-protocol-step.enum';

interface Props {
  sosAlertId: string;
  step: EmergencyProtocolStep;
  completedAt: Date;
  completedByAdminId: string | null;
}

/** A coordinator's completion of one emergency protocol step for an SOS alert. */
export class SosProtocolCompletion extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  public static complete(params: {
    id: string;
    sosAlertId: string;
    step: EmergencyProtocolStep;
    adminId: string | null;
    now: Date;
  }): SosProtocolCompletion {
    return new SosProtocolCompletion(params.id, {
      sosAlertId: params.sosAlertId,
      step: params.step,
      completedAt: params.now,
      completedByAdminId: params.adminId,
    });
  }

  public static rehydrate(id: string, props: Props): SosProtocolCompletion {
    return new SosProtocolCompletion(id, props);
  }

  public get sosAlertId(): string {
    return this.props.sosAlertId;
  }

  public get step(): EmergencyProtocolStep {
    return this.props.step;
  }

  public get completedAt(): Date {
    return this.props.completedAt;
  }

  public get completedByAdminId(): string | null {
    return this.props.completedByAdminId;
  }
}
