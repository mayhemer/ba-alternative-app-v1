import { ScheduledEvent } from 'aws-lambda';

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Sync triggered at', new Date().toISOString(), event);
  // TODO: implement sync logic
}
