Attribute VB_Name = "Tabelle1"
Attribute VB_Base = "0{00020820-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Private Sub Worksheet_Activate()
    
    On Error GoTo ErrHandler
    
    Debug.Print "Worksheet_Activate: 'Kanban' sheet activated"
    
    InitializeWorksheet
    
    AdaptTbl
    
    Exit Sub

ErrHandler:
    MsgBox "Fehler beim Aktivieren des Blatts 'Kanban': " & Err.Description, vbCritical
    
End Sub


Private Sub Worksheet_Calculate()
    
    On Error GoTo ErrHandler
    
    AdaptRowIndex
    
    Exit Sub

ErrHandler:
    MsgBox "Fehler in Worksheet_Calculate: " & Err.Description, vbCritical

End Sub
Private Sub Worksheet_Change(ByVal Target As Range)
    
    On Error GoTo ErrHandler

    If tbl Is Nothing Then Exit Sub

    ' Track changes
    If Not Intersect(Target, Me.Range("B:P")) Is Nothing Then
    
        Application.EnableEvents = False
        Application.ScreenUpdating = False

        Debug.Print "Worksheet_Change: handling edit in " & Target.Address

        AdaptTblSize
        AdaptRowIndex
        EnsureBufferRows

        Dim tblBody As Range
        Set tblBody = tbl.DataBodyRange

        If Not tblBody Is Nothing Then
            Dim changedRowIdx As Long
            changedRowIdx = Target.row - tbl.HeaderRowRange.row

            If changedRowIdx > 0 And changedRowIdx <= tblBody.Rows.Count Then

                ' Check if columns before the image have data
                Dim hasData As Boolean
                hasData = Application.WorksheetFunction.CountA( _
                    tblBody.Rows(changedRowIdx).Columns(2).Resize(, 12)) > 0

                ' Auto-fill "A6" in column P for any changed row that has data
                If hasData And tblBody.Cells(changedRowIdx, 16).Value = "" Then
                    tblBody.Cells(changedRowIdx, 16).Value = "A6"
                End If

                ' Create produt image button
                tblRow = changedRowIdx ' Set global variable for CreateSingleBtn
                CreateSingleBtn

            End If

        End If

        ' Clean up any layout anomalies
        On Error Resume Next
        ws.Shapes("Button_0").Delete
        On Error GoTo ErrHandler

        Application.EnableEvents = True
        Application.ScreenUpdating = True

    End If

    Exit Sub

ErrHandler:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    MsgBox "Fehler in Worksheet_Change: " & Err.Description, vbCritical

End Sub
