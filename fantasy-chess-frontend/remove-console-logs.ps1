# PowerShell script to remove console.log statements from frontend files

Write-Host "Removing console.log statements from frontend files..."

# Get all TypeScript and TSX files
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx"

foreach ($file in $files) {
    Write-Host "Processing: $($file.FullName)"
    
    # Read file content
    $content = Get-Content $file.FullName -Raw
    
    # Replace console.log statements with comments
    $newContent = $content -replace 'console\.log\([^)]*\);', '// console.log removed'
    $newContent = $newContent -replace 'console\.log\([^)]*\);', '// console.log removed'
    
    # Write back to file
    Set-Content $file.FullName $newContent -NoNewline
}

Write-Host "Console.log statements removed from all frontend files!"
