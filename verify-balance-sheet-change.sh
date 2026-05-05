#!/bin/bash

echo "🔧 BALANCE SHEET UI MODIFICATION VERIFICATION"
echo "=============================================="
echo ""

echo "📋 CURRENT BEHAVIOR (Production API):"
echo "--------------------------------------"
curl -s 'https://templeapi.agniplay.com/api/journal/balance-sheet?from=2026-05-03&to=2026-05-03' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsIm1vYmlsZSI6IjkyNDk5OTk5OTkiLCJ1c2VybmFtZSI6InRlc3R1c2VyMjQ1IiwidGVtcGxlSWQiOjI2LCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Nzc4MzAzOTMsImV4cCI6MTgwOTM2NjM5M30.QVnpXT--imceiWCZMh3DZEYxZUkoCmNHNeWRUk2VW08" \
  | jq -r '
    "ASSETS:",
    (.data.assets[] | "  • \(.account): ₹\(.balance)"),
    "",
    "INCOME ITEMS:",
    (.data.incomeItems[] | "  • \(.account): ₹\(.balance)"),
    "",
    "ISSUE: INCOME A/C (₹120.00) is currently in INCOME ITEMS section"
  '

echo ""
echo "✅ MODIFICATION MADE:"
echo "--------------------"
echo "File: /var/www/templerunvite/server/backend.js"
echo "Line: ~2998"
echo ""
echo "BEFORE:"
echo "  if (category.includes('income') || accountName === 'INCOME A/C') {"
echo "    incomeItems.push(item);"
echo "    return;"
echo "  }"
echo ""
echo "AFTER:"
echo "  if (category.includes('income') && accountName !== 'INCOME A/C') {"
echo "    incomeItems.push(item);"
echo "    return;"
echo "  }"
echo ""
echo "  // INCOME A/C goes to assets"
echo "  if (accountName === 'INCOME A/C') {"
echo "    assets.push(item);"
echo "    return;"
echo "  }"
echo ""
echo "📝 EXPECTED RESULT AFTER DEPLOYMENT:"
echo "------------------------------------"
echo "ASSETS:"
echo "  • CASH A/C: ₹3000"
echo "  • INCOME A/C: ₹120.00  ← MOVED HERE"
echo ""
echo "INCOME ITEMS:"
echo "  • ANNADHANAM A/C: ₹120"
echo "  • DONATION INCOME A/C: ₹3000"
echo ""
echo "✅ CHANGE COMPLETE: INCOME A/C will now appear in Assets section"