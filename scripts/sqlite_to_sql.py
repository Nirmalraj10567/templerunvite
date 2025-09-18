#!/usr/bin/env python3
"""
sqlite_to_sql.py

Convert a SQLite database file (.db/.sqlite/.sqlite3) into a portable .sql dump.

Features:
- Dump full database (schema + data) using sqlite3's iterdump
- Schema-only or data-only dumps
- Include or exclude specific tables
- Optional BEGIN/COMMIT transaction wrapping
- Pragma toggles to improve dump portability

Usage:
  python scripts/sqlite_to_sql.py path/to/database.sqlite3 -o dump.sql

Examples:
  # Full dump
  python scripts/sqlite_to_sql.py server/db.sqlite3 -o backup.sql

  # Schema only
  python scripts/sqlite_to_sql.py server/db.sqlite3 -o schema.sql --schema-only

  # Data only for a subset of tables
  python scripts/sqlite_to_sql.py server/db.sqlite3 -o data.sql --data-only --tables users,roles

  # Exclude some tables
  python scripts/sqlite_to_sql.py server/db.sqlite3 -o dump.sql --exclude-tables sqlite_sequence,temp_data
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import sys
from typing import Iterable, Iterator, List, Optional, Set


def _normalize_table_list(csv: Optional[str]) -> Set[str]:
    if not csv:
        return set()
    return {t.strip().strip('"').strip("'") for t in csv.split(',') if t.strip()}


def _iter_filtered_dump(
    conn: sqlite3.Connection,
    include_tables: Set[str],
    exclude_tables: Set[str],
    schema_only: bool,
    data_only: bool,
) -> Iterator[str]:
    """
    Wrap sqlite3.Connection.iterdump() and filter statements by table lists and dump mode.
    """
    include_all = not include_tables

    # Regex helpers to detect statement types and referenced objects
    create_re = re.compile(r'''^CREATE\s+(?:TEMP|TEMPORARY\s+)?(TABLE|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:'|")?([\w.]+)(?:'|")?''', re.IGNORECASE)
    insert_re = re.compile(r'''^INSERT\s+INTO\s+(?:'|")?([\w.]+)(?:'|")?''', re.IGNORECASE)
    alter_re = re.compile(r'''^ALTER\s+TABLE\s+(?:'|")?([\w.]+)(?:'|")?''', re.IGNORECASE)
    drop_re = re.compile(r'''^DROP\s+(TABLE|INDEX|TRIGGER)\s+(?:IF\s+EXISTS\s+)?(?:'|")?([\w.]+)(?:'|")?''', re.IGNORECASE)
    analyze_re = re.compile(r"^ANALYZE\b", re.IGNORECASE)

    for raw in conn.iterdump():
        stmt = raw.strip()
        if not stmt:
            continue

        upper = stmt.upper()
        # Skip ANALYZE and SQLite internal metadata changes for portability
        if analyze_re.match(stmt):
            continue

        # Identify the primary object/table in statement if applicable
        table: Optional[str] = None
        is_schema_stmt = False
        is_data_stmt = False

        m = insert_re.match(stmt)
        if m:
            table = m.group(1)
            is_data_stmt = True
        else:
            for rgx in (create_re, alter_re, drop_re):
                m2 = rgx.match(stmt)
                if m2:
                    # For CREATE/ALTER/DROP we have groups: kind, name OR name only
                    table = m2.groups()[-1]
                    is_schema_stmt = True
                    break

        # Determine if we should keep based on mode
        if schema_only and is_data_stmt:
            continue
        if data_only and is_schema_stmt:
            # Keep BEGIN/COMMIT even in data-only; they won't match schema/data regexes.
            pass

        # BEGIN/COMMIT and PRAGMA statements should usually pass
        if upper.startswith("BEGIN") or upper.startswith("COMMIT") or upper.startswith("PRAGMA"):
            yield stmt
            continue

        # If we couldn't extract a table (e.g., some PRAGMA or sequence updates), decide conservatively
        if not table:
            # Allow if not specifically excluded and mode doesn't block it
            yield stmt
            continue

        # Filter by include/exclude lists
        # Normalize quoting around names: SQLite may emit quoted identifiers
        norm_table = table.strip('"').strip("'")

        if norm_table.startswith("sqlite_"):
            # Skip internal SQLite tables by default unless explicitly included
            if norm_table not in include_tables:
                continue

        if not include_all and norm_table not in include_tables:
            continue
        if norm_table in exclude_tables:
            continue

        yield stmt


def dump_sqlite(
    db_path: str,
    output: Optional[str] = None,
    schema_only: bool = False,
    data_only: bool = False,
    tables: Optional[Set[str]] = None,
    exclude_tables: Optional[Set[str]] = None,
    wrap_transaction: bool = True,
    set_portable_pragmas: bool = True,
) -> str:
    """
    Create a .sql dump string from a SQLite database.

    Returns the SQL string. If output path is provided, it writes to the file as well.
    """
    if schema_only and data_only:
        raise ValueError("Cannot set both schema_only and data_only")

    tables = tables or set()
    exclude_tables = exclude_tables or set()

    if not os.path.isfile(db_path):
        raise FileNotFoundError(f"Database not found: {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        if set_portable_pragmas:
            # Make dump more portable and deterministic
            conn.execute("PRAGMA foreign_keys=OFF;")
            conn.execute("PRAGMA legacy_alter_table=ON;")
            conn.execute("PRAGMA writable_schema=OFF;")

        chunks: List[str] = []
        if wrap_transaction:
            chunks.append("BEGIN TRANSACTION;")

        for stmt in _iter_filtered_dump(
            conn,
            include_tables=tables,
            exclude_tables=exclude_tables,
            schema_only=schema_only,
            data_only=data_only,
        ):
            # Ensure each statement ends with a semicolon
            s = stmt
            if not s.endswith(';'):
                s += ';'
            chunks.append(s)

        if wrap_transaction:
            chunks.append("COMMIT;")

        sql_text = "\n".join(chunks) + "\n"

        if output:
            with open(output, "w", encoding="utf-8") as f:
                f.write(sql_text)

        return sql_text
    finally:
        conn.close()


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Dump a SQLite database to a .sql file")
    p.add_argument("db", help="Path to SQLite database file (.db/.sqlite/.sqlite3)")
    p.add_argument("-o", "--output", help="Path to write SQL dump. If omitted, prints to stdout")
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--schema-only", action="store_true", help="Dump only schema (no data)")
    mode.add_argument("--data-only", action="store_true", help="Dump only data (no schema)")
    p.add_argument("--tables", help="Comma-separated list of tables to include")
    p.add_argument("--exclude-tables", help="Comma-separated list of tables to exclude")
    p.add_argument("--no-transaction", action="store_true", help="Do not wrap output in BEGIN/COMMIT")
    p.add_argument(
        "--no-portable-pragmas",
        action="store_true",
        help="Do not set portability PRAGMAs (foreign_keys OFF, legacy_alter_table ON)",
    )
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    include_tables = _normalize_table_list(args.tables)
    exclude_tables = _normalize_table_list(args.exclude_tables)

    try:
        sql_text = dump_sqlite(
            db_path=args.db,
            output=args.output,
            schema_only=args.schema_only,
            data_only=args.data_only,
            tables=include_tables,
            exclude_tables=exclude_tables,
            wrap_transaction=not args.no_transaction,
            set_portable_pragmas=not args.no_portable_pragmas,
        )
        if not args.output:
            # Print to stdout
            sys.stdout.write(sql_text)
        return 0
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
