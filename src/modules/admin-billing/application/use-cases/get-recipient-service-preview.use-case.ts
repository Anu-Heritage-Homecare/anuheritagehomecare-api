import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { RecipientServicePreviewResult } from '../dto/invoice-wizard.result';
import {
  INVOICE_WIZARD_READ_MODEL,
  InvoiceWizardReadModel,
} from '../ports/invoice-wizard-read.port';

/** Load the Service Details Preview for a chosen care recipient (wizard step 2). */
@Injectable()
export class GetRecipientServicePreviewUseCase {
  constructor(@Inject(INVOICE_WIZARD_READ_MODEL) private readonly reads: InvoiceWizardReadModel) {}

  async execute(recipientId: string): Promise<RecipientServicePreviewResult> {
    const view = await this.reads.recipientServicePreview(recipientId);
    if (view === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    return {
      id: view.id,
      name: view.name,
      carePlanModel: view.carePlanModel,
      assignedCaregiverName: view.assignedCaregiverName,
      assignedCaregiverTitle: view.assignedCaregiverTitle,
      keyBillableTargets: view.careNeeds.map(careNeedLabel),
    };
  }
}

/** Title case a care need enum value for display: MEAL_PREPARATION becomes "Meal Preparation". */
function careNeedLabel(need: string): string {
  return need
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}
