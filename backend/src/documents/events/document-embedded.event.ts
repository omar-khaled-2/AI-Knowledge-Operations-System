export class DocumentEmbeddedEvent {
  constructor(
    public readonly documentId: string,
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}
