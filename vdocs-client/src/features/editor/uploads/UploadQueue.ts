import { UploadTask } from "./UploadTask";

export class UploadQueue {
  private tasks = new Map<string, UploadTask>();

  add(task: UploadTask): void {
    this.tasks.set(task.id, task);
  }

  get(id: string): UploadTask | undefined {
    return this.tasks.get(id);
  }

  remove(id: string): void {
    this.tasks.delete(id);
  }

  list(): UploadTask[] {
    return Array.from(this.tasks.values());
  }
}
