import type {AppliedTemplate} from '@domain/usecases/quick-action-templates';
import type {TransactionsStackParamList} from './types';

export type AddTransactionRouteParams = NonNullable<
  TransactionsStackParamList['AddTransaction']
>;

export function buildAddTransactionParamsFromApplied(
  applied: AppliedTemplate,
): AddTransactionRouteParams {
  const params: AddTransactionRouteParams = {
    type: applied.type,
  };
  if (applied.amount > 0) {
    params.templateAmount = applied.amount;
  }
  if (applied.categoryId) {
    params.templateCategoryId = applied.categoryId;
  }
  if (applied.description) {
    params.templateDescription = applied.description;
  }
  if (applied.merchant) {
    params.templateMerchant = applied.merchant;
  }
  if (applied.currency) {
    params.templateCurrency = applied.currency;
  }
  if (applied.tags.length > 0) {
    params.templateTags = [...applied.tags];
  }
  return params;
}
