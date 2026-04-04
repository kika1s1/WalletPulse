export type NotificationLog = {
  readonly id: string;
  readonly packageName: string;
  readonly title: string;
  readonly body: string;
  readonly parsedSuccessfully: boolean;
  readonly parseResult: string;
  readonly transactionId?: string;
  readonly receivedAt: number;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type CreateNotificationLogInput = Omit<NotificationLog, 'transactionId'> & {
  readonly transactionId?: string;
};

export function createNotificationLog(input: CreateNotificationLogInput): NotificationLog {
  const packageName = input.packageName.trim();
  if (!packageName) {
    throw new Error('packageName must not be empty');
  }
  const body = input.body.trim();
  if (!body) {
    throw new Error('body must not be empty');
  }
  return {...input, packageName, body};
}

export function wasCreatedAsTransaction(n: NotificationLog): boolean {
  return n.parsedSuccessfully && n.transactionId != null && n.transactionId !== '';
}

export function getParseResultObject(n: NotificationLog): unknown {
  try {
    return JSON.parse(n.parseResult) as unknown;
  } catch {
    return null;
  }
}
