export class DocumentCreatedEvent {
  constructor(
    public readonly documentId: string,
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly objectKey: string,
    public readonly name: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly sourceType: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}
