import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTranscriptChunksEmbeddingIndex1780506627586 implements MigrationInterface {
  name = 'CreateTranscriptChunksEmbeddingIndex1780506627586';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "transcript_chunks_embedding_hnsw_idx" ON "transcript_chunks" USING hnsw (("embedding"::halfvec(2048)) halfvec_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "transcript_chunks_embedding_hnsw_idx"`,
    );
  }
}
