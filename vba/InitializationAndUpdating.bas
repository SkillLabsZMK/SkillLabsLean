Attribute VB_Name = "InitializationAndUpdating"
Public ws As Worksheet
Public ws2 As Worksheet
Public imgColumn As Integer
Option Explicit

Public tbl As ListObject
Public supportTbl As ListObject
Public supportTbl2 As ListObject
Public tblRow As Long
Public saveFolder As String

' !!!ADAPT FILE PATH!!!
Public Const BasisPfad As String = "Q:\ZM\Prothetik\24_Organisation-Materialien\_Kanban-Karten-Liste\"


Public Sub AdaptTbl()
    
    On Error GoTo ErrHandler
    
    Application.ScreenUpdating = False
    
    Debug.Print "AdaptTbl: start"
    
    AdaptTblSize
    DeleteEmptyRows
    AdaptRowIndex
    
    UpdateImgNames
    UpdateBtnNames
    
    Application.ScreenUpdating = True
    
    Debug.Print "AdaptTbl: done"

    Exit Sub

ErrHandler:
    Application.ScreenUpdating = True
    MsgBox "Fehler in AdaptTbl: " & Err.Description, vbCritical
    
End Sub


' (Re-)applies sheet protection.
Public Sub BlockEditing()
    
    On Error GoTo ErrHandler

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets("Kanban")
    End If

    ws.Protect _
            AllowSorting:=True, _
            AllowFiltering:=True, _
            UserInterfaceOnly:=True, _
            AllowFormattingCells:=True, _
            AllowFormattingRows:=True, _
            AllowFormattingColumns:=True, _
            DrawingObjects:=False
    Exit Sub

ErrHandler:
    MsgBox "Fehler in BlockEditing: " & Err.Description, vbCritical

End Sub


' Closes any open UserForms related to image handling.
Public Sub CloseUserForms()

    ' Unload UserForms if they happen to be open; ignore errors if they're not
    On Error Resume Next
    Unload NewImg
    Unload GroupImg
    Unload OtherMethod
    On Error GoTo 0

End Sub


Public Sub InitializeWorksheet()

    On Error GoTo ErrHandler

    Debug.Print "InitializeWorksheet: start"

    Set ws = ThisWorkbook.Sheets("Kanban")
    Set ws2 = ThisWorkbook.Sheets("Hilfstabellen")
    Set tbl = ws.ListObjects("Materialliste")
    Set supportTbl = ws2.ListObjects("Einkauf")
    Set supportTbl2 = ws2.ListObjects("Kostenstelle")

    ' Set folder for storing images
    saveFolder = BasisPfad & "ProductImages\"

    ' Set column for images
    imgColumn = 17

    ' Capture existing buttons and images
    Set existingShapes = New Collection
    ListShapes

    ' Block editing of index and images
    ws.Cells.Locked = True

    ' Unprotect Worksheet
    tbl.DataBodyRange.Locked = False
    tbl.ListColumns(1).DataBodyRange.Locked = True
    tbl.ListColumns(imgColumn).DataBodyRange.Locked = True

    ' Add three buffer rows
    EnsureBufferRows

    BlockEditing

    Debug.Print "InitializeWorksheet: done"

    Exit Sub

ErrHandler:
    MsgBox "Fehler in InitializeWorksheet: " & Err.Description, vbCritical

End Sub


' Ensures a fixed number of unlocked "buffer" rows exist right after the
' table, so users have somewhere to type new entries
Public Sub EnsureBufferRows(Optional bufferCount As Long = 3)
    
    On Error GoTo ErrHandler
    
    Dim lastTableRow As Long
    Dim bufferStartRow As Long
    Dim r As Long
    
    lastTableRow = tbl.DataBodyRange.Rows(tbl.DataBodyRange.Rows.Count).row
    bufferStartRow = lastTableRow + 1
    
    For r = 0 To bufferCount - 1
        With ws.Rows(bufferStartRow + r)
            .EntireRow.Locked = False
            .Cells(1, 1).Locked = True
            .Cells(1, imgColumn).Locked = True
        End With
    Next r
    
    Debug.Print "EnsureBufferRows: added " & bufferCount & " buffer row(s) starting at row " & bufferStartRow

    Exit Sub

ErrHandler:
    MsgBox "Fehler in EnsureBufferRows: " & Err.Description, vbCritical

End Sub


' Regenerates all row buttons
Private Sub UpdateBtnNames()
    
    On Error GoTo ErrHandler

    Dim shp As Shape
    Dim i As Long
    Dim filterCriteria1() As Variant
    Dim filterCriteria2() As Variant
    Dim filterOperator() As Variant
    Dim filterOn() As Boolean
    
    Dim filterCount As Long
    filterCount = tbl.AutoFilter.Filters.Count

    ReDim filterCriteria1(1 To filterCount)
    ReDim filterCriteria2(1 To filterCount)
    ReDim filterOperator(1 To filterCount)
    ReDim filterOn(1 To filterCount)
    
    ' Save current filter state per column
    For i = 1 To filterCount
        With tbl.AutoFilter.Filters(i)
            filterOn(i) = .On
            If .On Then
                filterCriteria1(i) = .Criteria1
                ' A filter only has Criteria2/Operator when it's a two-condition filter
                On Error Resume Next
                filterCriteria2(i) = .Criteria2
                filterOperator(i) = .Operator
                On Error GoTo ErrHandler
            End If
        End With
    Next i
    
    ' Deactivate all filters so every row is visible while buttons are rebuilt
    tbl.AutoFilter.ShowAllData
    
    CreateBtns

    ' Restore filters
    For i = 1 To filterCount
        If filterOn(i) Then
            If isEmpty(filterCriteria2(i)) Then
                tbl.Range.AutoFilter Field:=i, Criteria1:=filterCriteria1(i)
            Else
                tbl.Range.AutoFilter Field:=i, Criteria1:=filterCriteria1(i), _
                    Operator:=filterOperator(i), Criteria2:=filterCriteria2(i)
            End If
        End If
    Next i

    Debug.Print "UpdateBtnNames: rebuilt buttons and restored " & filterCount & " filter column(s)"

    Exit Sub

ErrHandler:
    MsgBox "Fehler in UpdateBtnNames: " & Err.Description, vbCritical

End Sub


' Renames product image files to match each row's current index, keeping the filename
' in sync as rows get reordered, inserted, or deleted.
Private Sub UpdateImgNames()

    On Error GoTo ErrHandler

    Dim row As ListRow
    Dim currentImgName As String
    Dim currentFilePath As String
    Dim newImgName As String
    Dim newFilePath As String
    
    For Each row In tbl.ListRows
        
        ' Check current image name and define new name
        currentImgName = row.Range.Columns(imgColumn).Value
        currentFilePath = saveFolder & currentImgName
        newImgName = "Image_" & row.Index & ".png"
        newFilePath = saveFolder & newImgName
        
        
        ' Set new name by need
        If currentImgName <> newImgName Then
        
            If Dir(currentFilePath) <> "" Then
                On Error Resume Next
                FileCopy currentFilePath, newFilePath
                
                If Err.Number = 0 Then
                    Kill currentFilePath
                    row.Range.Columns(imgColumn).Value = newImgName
                Else
                    Err.Clear
                    If Dir(newFilePath) <> "" Then
                        row.Range.Columns(imgColumn).Value = newImgName
                    End If
                End If
                On Error GoTo ErrHandler
                
            Else
            
                If Dir(newFilePath) <> "" Then
                    row.Range.Columns(imgColumn).Value = newImgName
                End If
                
            End If
            
        End If
    
    Next row

    Debug.Print "UpdateImgNames: done"

    Exit Sub

ErrHandler:
    MsgBox "Fehler in UpdateImgNames: " & Err.Description, vbCritical

End Sub



' Scans the ProductImages folder and fills in any table row's image column
' that's currently empty but has a matching "Image_<row>.png" file on disk.
Public Sub SyncImagesFromFolder()

    On Error GoTo ErrHandler
    
    Dim row As ListRow
    Dim imgName As String
    Dim imgPath As String

    ws.Unprotect
    
    Debug.Print "SyncImagesFromFolder: start"

    For Each row In tbl.ListRows
        imgName = "Image_" & row.Index & ".png"
        imgPath = saveFolder & imgName

        If Dir(imgPath) <> "" And row.Range.Cells(imgColumn).Value = "" Then
            row.Range.Cells(imgColumn).Value = imgName
        End If
    Next row

    UpdateBtnNames

    BlockEditing

    Debug.Print "SyncImagesFromFolder: done"

    MsgBox "Synchronisierung abgeschlossen!", vbInformation

    Exit Sub

ErrHandler:
    MsgBox "Fehler in SyncImagesFromFolder: " & Err.Description, vbCritical

End Sub

