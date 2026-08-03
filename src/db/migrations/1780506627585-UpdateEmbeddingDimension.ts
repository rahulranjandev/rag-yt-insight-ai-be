import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEmbeddingDimension1780506627585 implements MigrationInterface {
  name = 'UpdateEmbeddingDimension1780506627585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transcript_chunks" DROP COLUMN "embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transcript_chunks" ADD "embedding" vector(2048) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transcript_chunks" DROP COLUMN "embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transcript_chunks" ADD "embedding" vector(1536) NOT NULL`,
    );
  }
}
