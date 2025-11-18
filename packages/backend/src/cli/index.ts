#!/usr/bin/env node

/**
 * Conflict Resolution Mediator CLI
 *
 * Command-line interface for administration and automation
 */

import { program } from 'commander';
import { prisma } from '../lib/db';

program
  .name('mediator-cli')
  .description('Conflict Resolution Mediator Bot - CLI Tool')
  .version('1.0.0');

// Stats command
program
  .command('stats')
  .description('Show system statistics')
  .option('--community <id>', 'Filter by community ID')
  .action(async (options) => {
    try {
      const where = options.community ? { communityId: options.community } : {};

      const [
        totalThreads,
        totalSignals,
        totalCases,
        openCases,
        inProgressCases,
        resolvedCases,
      ] = await Promise.all([
        prisma.conversationThread.count(),
        prisma.conflictSignal.count(),
        prisma.mediationCase.count(),
        prisma.mediationCase.count({ where: { status: 'open' } }),
        prisma.mediationCase.count({ where: { status: 'in_progress' } }),
        prisma.mediationCase.count({ where: { status: 'resolved' } }),
      ]);

      console.log('\n📊 System Statistics');
      console.log('═'.repeat(50));
      console.log(`Total Conversation Threads: ${totalThreads}`);
      console.log(`Total Conflict Signals:     ${totalSignals}`);
      console.log(`Total Mediation Cases:      ${totalCases}`);
      console.log('\nCase Breakdown:');
      console.log(`  Open:         ${openCases}`);
      console.log(`  In Progress:  ${inProgressCases}`);
      console.log(`  Resolved:     ${resolvedCases}`);
      console.log('═'.repeat(50) + '\n');
    } catch (error) {
      console.error('Error fetching stats:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Assign case command
program
  .command('assign-case <caseId> <mediatorRef>')
  .description('Assign a case to a mediator')
  .action(async (caseId, mediatorRef) => {
    try {
      const updated = await prisma.mediationCase.update({
        where: { id: caseId },
        data: { assignedMediatorRef: mediatorRef },
      });

      console.log(`\n✅ Case ${caseId} assigned to ${mediatorRef}`);
      console.log(`Status: ${updated.status}\n`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.error(`\n❌ Case not found: ${caseId}\n`);
      } else {
        console.error('Error assigning case:', error);
      }
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List cases command
program
  .command('list-cases')
  .description('List all mediation cases')
  .option('--status <status>', 'Filter by status')
  .option('--limit <number>', 'Limit number of results', '10')
  .action(async (options) => {
    try {
      const where: any = {};
      if (options.status) {
        where.status = options.status;
      }

      const cases = await prisma.mediationCase.findMany({
        where,
        include: {
          thread: {
            select: {
              communityId: true,
              externalThreadId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(options.limit),
      });

      console.log(`\n📋 Mediation Cases (showing ${cases.length})`);
      console.log('═'.repeat(80));

      if (cases.length === 0) {
        console.log('No cases found.');
      } else {
        cases.forEach((case_) => {
          console.log(`\nID: ${case_.id}`);
          console.log(`Thread: ${case_.thread.externalThreadId} (${case_.thread.communityId})`);
          console.log(`Status: ${case_.status}`);
          console.log(`Assigned: ${case_.assignedMediatorRef || 'Unassigned'}`);
          console.log(`Created: ${case_.createdAt.toISOString()}`);
          console.log('-'.repeat(80));
        });
      }

      console.log('═'.repeat(80) + '\n');
    } catch (error) {
      console.error('Error listing cases:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Export report command
program
  .command('export-report')
  .description('Export a CSV report of cases')
  .option('--from <date>', 'Start date (ISO format)')
  .option('--to <date>', 'End date (ISO format)')
  .option('--output <file>', 'Output file path', 'report.csv')
  .action(async (options) => {
    try {
      const where: any = {};

      if (options.from) {
        where.createdAt = { gte: new Date(options.from) };
      }

      if (options.to) {
        where.createdAt = { ...where.createdAt, lte: new Date(options.to) };
      }

      const cases = await prisma.mediationCase.findMany({
        where,
        include: {
          thread: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const fs = await import('fs');
      const csv = [
        'ID,Thread ID,Community ID,Status,Created At,Updated At',
        ...cases.map(
          (c) =>
            `${c.id},${c.thread.externalThreadId},${c.thread.communityId},${c.status},${c.createdAt.toISOString()},${c.updatedAt.toISOString()}`
        ),
      ].join('\n');

      fs.writeFileSync(options.output, csv);
      console.log(`\n✅ Report exported to ${options.output}`);
      console.log(`${cases.length} cases included\n`);
    } catch (error) {
      console.error('Error exporting report:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Clean old data command
program
  .command('clean-old-data')
  .description('Clean up old resolved cases and signals')
  .option('--days <number>', 'Delete data older than N days', '90')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .action(async (options) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(options.days));

      console.log(`\n🧹 Cleaning data older than ${cutoffDate.toISOString()}\n`);

      if (options.dryRun) {
        const resolvedCases = await prisma.mediationCase.count({
          where: {
            status: 'resolved',
            updatedAt: { lt: cutoffDate },
          },
        });

        const oldSignals = await prisma.conflictSignal.count({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });

        console.log('[DRY RUN] Would delete:');
        console.log(`  Resolved cases: ${resolvedCases}`);
        console.log(`  Old signals:    ${oldSignals}\n`);
      } else {
        const deletedCases = await prisma.mediationCase.deleteMany({
          where: {
            status: 'resolved',
            updatedAt: { lt: cutoffDate },
          },
        });

        const deletedSignals = await prisma.conflictSignal.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });

        console.log('✅ Deleted:');
        console.log(`  Resolved cases: ${deletedCases.count}`);
        console.log(`  Old signals:    ${deletedSignals.count}\n`);
      }
    } catch (error) {
      console.error('Error cleaning data:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();
