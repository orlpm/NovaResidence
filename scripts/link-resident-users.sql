-- Script completo para vincular usuarios con residentes y crear nuevos residentes
-- Condominio: Recidencial Interlomas de clara@gmail.com

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Variables
DECLARE @claraUserId UNIQUEIDENTIFIER
DECLARE @condominiumId UNIQUEIDENTIFIER
DECLARE @buildingId UNIQUEIDENTIFIER
DECLARE @unit101Id UNIQUEIDENTIFIER
DECLARE @unit102Id UNIQUEIDENTIFIER
DECLARE @unit103Id UNIQUEIDENTIFIER

-- 1. Obtener el UserId de clara@gmail.com
SELECT @claraUserId = Id FROM [auth].[Users] WHERE Email = 'clara@gmail.com'
PRINT 'Clara UserId: ' + ISNULL(CAST(@claraUserId AS NVARCHAR(50)), 'NO ENCONTRADO')

-- 2. Obtener el condominio Recidencial Interlomas
SELECT @condominiumId = Id FROM [condo].[Condominiums] WHERE Name LIKE '%Interlomas%'
PRINT 'Condominium Id: ' + ISNULL(CAST(@condominiumId AS NVARCHAR(50)), 'NO ENCONTRADO')

-- 3. Obtener el primer edificio del condominio
SELECT TOP 1 @buildingId = Id FROM [condo].[Buildings] WHERE CondominiumId = @condominiumId
PRINT 'Building Id: ' + ISNULL(CAST(@buildingId AS NVARCHAR(50)), 'NO ENCONTRADO')

-- 4. Obtener las unidades 101, 102, 103
SELECT @unit101Id = Id FROM [condo].[Units] WHERE BuildingId = @buildingId AND UnitNumber = '101'
SELECT @unit102Id = Id FROM [condo].[Units] WHERE BuildingId = @buildingId AND UnitNumber = '102'
SELECT @unit103Id = Id FROM [condo].[Units] WHERE BuildingId = @buildingId AND UnitNumber = '103'

PRINT 'Unit 101 Id: ' + ISNULL(CAST(@unit101Id AS NVARCHAR(50)), 'NO ENCONTRADO')
PRINT 'Unit 102 Id: ' + ISNULL(CAST(@unit102Id AS NVARCHAR(50)), 'NO ENCONTRADO')
PRINT 'Unit 103 Id: ' + ISNULL(CAST(@unit103Id AS NVARCHAR(50)), 'NO ENCONTRADO')

-- =====================================================
-- PASO 1: Vincular usuarios existentes con residentes por email
-- =====================================================
PRINT '--- Vinculando usuarios existentes con residentes ---'

UPDATE r
SET r.UserId = u.Id,
    r.IsRegistered = 1,
    r.RegisteredAt = GETUTCDATE()
FROM [condo].[Residents] r
INNER JOIN [auth].[Users] u ON LOWER(r.Email) = LOWER(u.Email)
WHERE r.UserId IS NULL
  AND r.IsActive = 1;

PRINT 'Residentes vinculados: ' + CAST(@@ROWCOUNT AS NVARCHAR(10))

-- =====================================================
-- PASO 2: Crear usuario y residente para juana@gmail.com en unidad 101
-- =====================================================
PRINT '--- Procesando juana@gmail.com para unidad 101 ---'

DECLARE @juanaUserId UNIQUEIDENTIFIER

-- Verificar si el usuario ya existe
SELECT @juanaUserId = Id FROM [auth].[Users] WHERE Email = 'juana@gmail.com'

-- Si no existe, crear el usuario
IF @juanaUserId IS NULL
BEGIN
    SET @juanaUserId = NEWID()
    INSERT INTO [auth].[Users] (Id, Email, PasswordHash, FirstName, LastName, PhoneNumber, DefaultRole, IsActive, IsEmailConfirmed, CreatedAt, UpdatedAt)
    VALUES (@juanaUserId, 'juana@gmail.com', 'anVhbmExMjM=', 'Juana', 'Perez', '5551234567', 'Resident', 1, 1, GETUTCDATE(), GETUTCDATE())
    PRINT 'Usuario juana@gmail.com creado'
END
ELSE
    PRINT 'Usuario juana@gmail.com ya existe'

-- Crear el registro de residente si no existe
IF @unit101Id IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [condo].[Residents] WHERE Email = 'juana@gmail.com' AND UnitId = @unit101Id)
    BEGIN
        INSERT INTO [condo].[Residents] (Id, UnitId, FirstName, LastName, Email, PhoneNumber, Type, IsActive, IsRegistered, UserId, MoveInDate, RegisteredAt, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @unit101Id, 'Juana', 'Perez', 'juana@gmail.com', '5551234567', 1, 1, 1, @juanaUserId, GETUTCDATE(), GETUTCDATE(), GETUTCDATE(), GETUTCDATE())
        PRINT 'Residente juana@gmail.com creado en unidad 101'
    END
    ELSE
    BEGIN
        UPDATE [condo].[Residents] 
        SET UserId = @juanaUserId, IsRegistered = 1, RegisteredAt = GETUTCDATE()
        WHERE Email = 'juana@gmail.com' AND UnitId = @unit101Id
        PRINT 'Residente juana@gmail.com actualizado en unidad 101'
    END
END
ELSE
    PRINT 'ERROR: No se encontro unidad 101'

-- =====================================================
-- PASO 3: Crear usuario y residente para filo@gmail.com en unidad 102
-- =====================================================
PRINT '--- Procesando filo@gmail.com para unidad 102 ---'

DECLARE @filoUserId UNIQUEIDENTIFIER

-- Verificar si el usuario ya existe
SELECT @filoUserId = Id FROM [auth].[Users] WHERE Email = 'filo@gmail.com'

-- Si no existe, crear el usuario
IF @filoUserId IS NULL
BEGIN
    SET @filoUserId = NEWID()
    INSERT INTO [auth].[Users] (Id, Email, PasswordHash, FirstName, LastName, PhoneNumber, DefaultRole, IsActive, IsEmailConfirmed, CreatedAt, UpdatedAt)
    VALUES (@filoUserId, 'filo@gmail.com', 'ZmlsbzEyMw==', 'Filo', 'Garcia', '5559876543', 'Resident', 1, 1, GETUTCDATE(), GETUTCDATE())
    PRINT 'Usuario filo@gmail.com creado'
END
ELSE
    PRINT 'Usuario filo@gmail.com ya existe'

-- Crear el registro de residente si no existe
IF @unit102Id IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [condo].[Residents] WHERE Email = 'filo@gmail.com' AND UnitId = @unit102Id)
    BEGIN
        INSERT INTO [condo].[Residents] (Id, UnitId, FirstName, LastName, Email, PhoneNumber, Type, IsActive, IsRegistered, UserId, MoveInDate, RegisteredAt, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @unit102Id, 'Filo', 'Garcia', 'filo@gmail.com', '5559876543', 1, 1, 1, @filoUserId, GETUTCDATE(), GETUTCDATE(), GETUTCDATE(), GETUTCDATE())
        PRINT 'Residente filo@gmail.com creado en unidad 102'
    END
    ELSE
    BEGIN
        UPDATE [condo].[Residents] 
        SET UserId = @filoUserId, IsRegistered = 1, RegisteredAt = GETUTCDATE()
        WHERE Email = 'filo@gmail.com' AND UnitId = @unit102Id
        PRINT 'Residente filo@gmail.com actualizado en unidad 102'
    END
END
ELSE
    PRINT 'ERROR: No se encontro unidad 102'

-- =====================================================
-- PASO 4: Asegurar que j@gmail.com esta vinculado a unidad 103
-- =====================================================
PRINT '--- Verificando j@gmail.com en unidad 103 ---'

DECLARE @jUserId UNIQUEIDENTIFIER
SELECT @jUserId = Id FROM [auth].[Users] WHERE Email = 'j@gmail.com'

IF @jUserId IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM [condo].[Residents] WHERE Email = 'j@gmail.com')
    BEGIN
        UPDATE [condo].[Residents] 
        SET UserId = @jUserId, IsRegistered = 1, RegisteredAt = GETUTCDATE()
        WHERE Email = 'j@gmail.com' AND UserId IS NULL
        PRINT 'Residente j@gmail.com vinculado'
    END
    ELSE IF @unit103Id IS NOT NULL
    BEGIN
        INSERT INTO [condo].[Residents] (Id, UnitId, FirstName, LastName, Email, PhoneNumber, Type, IsActive, IsRegistered, UserId, MoveInDate, RegisteredAt, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @unit103Id, 'J', 'Usuario', 'j@gmail.com', '', 1, 1, 1, @jUserId, GETUTCDATE(), GETUTCDATE(), GETUTCDATE(), GETUTCDATE())
        PRINT 'Residente j@gmail.com creado en unidad 103'
    END
END
ELSE
    PRINT 'Usuario j@gmail.com no existe en el sistema'

-- =====================================================
-- VERIFICACION FINAL
-- =====================================================
PRINT ''
PRINT '=== VERIFICACION FINAL ==='

SELECT 
    r.FirstName + ' ' + r.LastName AS Nombre,
    r.Email,
    u.UnitNumber AS Unidad,
    CASE WHEN r.UserId IS NOT NULL THEN 'VINCULADO' ELSE 'NO VINCULADO' END AS Estado
FROM [condo].[Residents] r
LEFT JOIN [condo].[Units] u ON r.UnitId = u.Id
WHERE u.BuildingId = @buildingId
ORDER BY u.UnitNumber;

SELECT 
    u.FirstName + ' ' + u.LastName AS Nombre,
    u.Email,
    u.DefaultRole AS Rol
FROM [auth].[Users] u
WHERE u.Email IN ('clara@gmail.com', 'j@gmail.com', 'juana@gmail.com', 'filo@gmail.com')
ORDER BY u.Email;

