#!/bin/bash

# Asset Management MySQL Test Script
# This script runs the MySQL migration and tests

echo "========================================"
echo "ASSET MANAGEMENT - MYSQL SETUP & TEST"
echo "========================================"
echo ""

# Check if MySQL is running
echo "Checking MySQL connection..."
if ! mysqladmin ping -h"${MYSQL_HOST:-127.0.0.1}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD:-rootroot}" --silent 2>/dev/null; then
    echo "✗ MySQL is not running or connection failed"
    echo "Please start MySQL and try again"
    exit 1
fi
echo "✓ MySQL is running"
echo ""

# Check if database exists
echo "Checking database..."
DB_EXISTS=$(mysql -h"${MYSQL_HOST:-127.0.0.1}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD:-rootroot}" -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${MYSQL_DATABASE:-temple}';" 2>/dev/null)

if [ -z "$DB_EXISTS" ]; then
    echo "⚠ Database '${MYSQL_DATABASE:-temple}' does not exist"
    echo "Creating database..."
    mysql -h"${MYSQL_HOST:-127.0.0.1}" -P"${MYSQL_PORT:-3306}" -u"${MYSQL_USER:-root}" -p"${MYSQL_PASSWORD:-rootroot}" -e "CREATE DATABASE ${MYSQL_DATABASE:-temple} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Database created"
    else
        echo "✗ Failed to create database"
        exit 1
    fi
else
    echo "✓ Database exists"
fi
echo ""

# Run migration
echo "Running MySQL migration..."
echo "----------------------------------------"
node migrate-assets-mysql.js
if [ $? -ne 0 ]; then
    echo "✗ Migration failed"
    exit 1
fi
echo ""

# Check if backend is running
echo "Checking if backend is running..."
if ! curl -s https://templeapi.agniplay.com/api/health > /dev/null 2>&1; then
    echo "⚠ Backend server not detected at https://templeapi.agniplay.com"
    echo "Please start the backend server before running tests:"
    echo "  cd /Volumes/KANINFOTECH/demo/templerunvite/server"
    echo "  node backend.js"
    echo ""
    read -p "Start backend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting backend in background..."
        node backend.js &
        BACKEND_PID=$!
        echo "Backend PID: $BACKEND_PID"
        echo "Waiting for backend to start..."
        sleep 5
    else
        echo "Please start the backend manually and run tests again"
        exit 0
    fi
else
    echo "✓ Backend is running"
fi
echo ""

# Run tests
echo "========================================"
echo "RUNNING API TESTS"
echo "========================================"
node test-assets-api.js

# Cleanup
echo ""
echo "========================================"
echo "TEST COMPLETE"
echo "========================================"
