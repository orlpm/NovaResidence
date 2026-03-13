SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE #TargetCondominiums (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetBuildings (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetUnits (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetUsers (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetResidents (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetCommonAreas (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetAmenities (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetAnnouncements (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetCharges (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetIncidents (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetMeetings (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetPolls (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetForumPosts (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetReservations (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetProcedures (Id UNIQUEIDENTIFIER PRIMARY KEY);
    CREATE TABLE #TargetSubscriptions (Id UNIQUEIDENTIFIER PRIMARY KEY);

    INSERT INTO #TargetUsers (Id)
    SELECT u.Id
    FROM [auth].[Users] u
    WHERE u.Email LIKE N'%@e2e.local'
       OR u.Email LIKE N'%@demo.test'
       OR u.Email LIKE N'amenity.debug.%';

    INSERT INTO #TargetCondominiums (Id)
    SELECT c.Id
    FROM [condo].[Condominiums] c
    WHERE c.Name LIKE N'Condo %'
       OR c.Name LIKE N'Condo Billing Ops %'
       OR c.Description LIKE N'Escenario automatizado de %'
       OR EXISTS (
            SELECT 1
            FROM [auth].[UserCondominiumRoles] ucr
            WHERE ucr.CondominiumId = c.Id
              AND ucr.UserId IN (SELECT Id FROM #TargetUsers)
       );

    INSERT INTO #TargetBuildings (Id)
    SELECT b.Id
    FROM [condo].[Buildings] b
    WHERE b.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR b.Name LIKE N'Torre Tramites %'
       OR b.Name LIKE N'Torre E2E %'
       OR b.Name LIKE N'Torre Relacion %'
       OR b.Name LIKE N'Torre Relaci_n %'
       OR b.Name LIKE N'Torre UI %'
       OR b.Name LIKE N'Torre condo.mgmt.ui %'
       OR b.Name LIKE N'Torre A'
      OR b.Name LIKE N'Torre Billing %'
       OR b.Name LIKE N'Torre Pagos %'
       OR b.Name LIKE N'Torre Debug%'
       OR b.Name LIKE N'Torre security.ops.ui %'
       OR b.Name LIKE N'Torre staff.ops.ui %'
       OR b.Name LIKE N'Torre maintenance.ops.ui %'
       OR b.Name LIKE N'Torre accountant.dashboard.ui %';

    INSERT INTO #TargetUnits (Id)
    SELECT u.Id
    FROM [condo].[Units] u
    WHERE u.BuildingId IN (SELECT Id FROM #TargetBuildings)
       OR u.UnitNumber LIKE N'TRM-%'
       OR u.UnitNumber LIKE N'E2E-%'
       OR u.UnitNumber LIKE N'U-%'
      OR u.UnitNumber LIKE N'B-%'
       OR u.UnitNumber LIKE N'REL-%'
       OR u.UnitNumber LIKE N'UI-%'
       OR u.UnitNumber LIKE N'ACC-%'
       OR u.UnitNumber LIKE N'SEC-%'
       OR u.UnitNumber LIKE N'MAI-%'
       OR u.UnitNumber LIKE N'STA-%'
       OR u.UnitNumber LIKE N'TEN-%'
       OR u.UnitNumber LIKE N'COM-%'
       OR u.UnitNumber LIKE N'PAY-%';

    INSERT INTO #TargetResidents (Id)
    SELECT r.Id
    FROM [condo].[Residents] r
    WHERE r.UnitId IN (SELECT Id FROM #TargetUnits)
       OR r.UserId IN (SELECT Id FROM #TargetUsers)
      OR r.Email LIKE N'%@e2e.local'
      OR r.Email LIKE N'%@demo.test';

    INSERT INTO #TargetCommonAreas (Id)
    SELECT ca.Id
    FROM [condo].[CommonAreas] ca
    WHERE ca.CondominiumId IN (SELECT Id FROM #TargetCondominiums);

    INSERT INTO #TargetAmenities (Id)
    SELECT a.Id
    FROM [dbo].[Amenities] a
    WHERE a.CondominiumId IN (SELECT Id FROM #TargetCondominiums);

    INSERT INTO #TargetAnnouncements (Id)
    SELECT a.Id
    FROM [dbo].[Announcements] a
    WHERE a.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
      OR a.CreatedBy LIKE N'%@e2e.local%'
      OR a.CreatedBy LIKE N'%@demo.test%'
      OR a.Title LIKE N'%E2E%'
      OR a.Content LIKE N'%@e2e.local%'
      OR a.Content LIKE N'%@demo.test%';

    INSERT INTO #TargetCharges (Id)
    SELECT c.Id
    FROM [dbo].[Charges] c
    WHERE c.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR c.UnitId IN (SELECT Id FROM #TargetUnits)
       OR c.ResidentId IN (SELECT Id FROM #TargetResidents)
      OR c.CreatedBy LIKE N'%@e2e.local%'
      OR c.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetIncidents (Id)
    SELECT i.Id
    FROM [dbo].[Incidents] i
    WHERE i.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR i.UnitId IN (SELECT Id FROM #TargetUnits)
       OR i.ReportedById IN (SELECT Id FROM #TargetUsers)
       OR i.AssignedToId IN (SELECT Id FROM #TargetUsers)
       OR i.Title LIKE N'%E2E%'
       OR i.Title LIKE N'Incidencia detalle asignaci_n %'
       OR i.Title LIKE N'Incidencia detalle asignación %'
      OR i.Title LIKE N'Incidente seguridad %'
      OR i.CreatedBy LIKE N'%@e2e.local%'
      OR i.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetMeetings (Id)
    SELECT m.Id
    FROM [dbo].[Meetings] m
    WHERE m.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR m.Title LIKE N'%E2E%'
      OR m.CreatedBy LIKE N'%@e2e.local%'
      OR m.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetPolls (Id)
    SELECT p.Id
    FROM [dbo].[Polls] p
    WHERE p.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR p.Title LIKE N'%E2E%'
      OR p.CreatedBy LIKE N'%@e2e.local%'
      OR p.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetForumPosts (Id)
    SELECT fp.Id
    FROM [dbo].[ForumPosts] fp
    WHERE fp.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR fp.AuthorUnitId IN (SELECT Id FROM #TargetUnits)
       OR fp.Title LIKE N'%E2E%'
       OR fp.AuthorName LIKE N'%E2E%'
      OR fp.CreatedBy LIKE N'%@e2e.local%'
      OR fp.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetReservations (Id)
    SELECT r.Id
    FROM [dbo].[Reservations] r
    WHERE r.UnitId IN (SELECT Id FROM #TargetUnits)
       OR r.AmenityId IN (SELECT Id FROM #TargetAmenities)
       OR r.ReservedByUserId IN (SELECT Id FROM #TargetUsers)
      OR r.CreatedBy LIKE N'%@e2e.local%'
      OR r.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetProcedures (Id)
    SELECT rp.Id
    FROM [ops].[ResidentProcedures] rp
    WHERE rp.CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR rp.ResidentId IN (SELECT Id FROM #TargetResidents)
      OR rp.CreatedBy LIKE N'%@e2e.local%'
      OR rp.CreatedBy LIKE N'%@demo.test%';

    INSERT INTO #TargetSubscriptions (Id)
    SELECT s.Id
    FROM [billing].[Subscriptions] s
    WHERE s.AdminUserId IN (SELECT Id FROM #TargetUsers)
      OR s.CreatedBy LIKE N'%@e2e.local%'
      OR s.CreatedBy LIKE N'%@demo.test%';

    SELECT 'TargetCondominiums' AS [GroupName], COUNT(*) AS [RowCount] FROM #TargetCondominiums
    UNION ALL SELECT 'TargetBuildings', COUNT(*) FROM #TargetBuildings
    UNION ALL SELECT 'TargetUnits', COUNT(*) FROM #TargetUnits
    UNION ALL SELECT 'TargetUsers', COUNT(*) FROM #TargetUsers
    UNION ALL SELECT 'TargetResidents', COUNT(*) FROM #TargetResidents
    UNION ALL SELECT 'TargetAnnouncements', COUNT(*) FROM #TargetAnnouncements
    UNION ALL SELECT 'TargetCharges', COUNT(*) FROM #TargetCharges
    UNION ALL SELECT 'TargetIncidents', COUNT(*) FROM #TargetIncidents
    UNION ALL SELECT 'TargetMeetings', COUNT(*) FROM #TargetMeetings
    UNION ALL SELECT 'TargetPolls', COUNT(*) FROM #TargetPolls
    UNION ALL SELECT 'TargetForumPosts', COUNT(*) FROM #TargetForumPosts
    UNION ALL SELECT 'TargetReservations', COUNT(*) FROM #TargetReservations
    UNION ALL SELECT 'TargetProcedures', COUNT(*) FROM #TargetProcedures
    UNION ALL SELECT 'TargetSubscriptions', COUNT(*) FROM #TargetSubscriptions;

    DELETE FROM [billing].[SubscriptionPayments]
    WHERE SubscriptionId IN (SELECT Id FROM #TargetSubscriptions);

    DELETE FROM [auth].[CondominiumRolePermissions]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums);

    DELETE FROM [auth].[UserPermissions]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR UserId IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [auth].[UserCondominiumRoles]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR UserId IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [condo].[CommonAreaReservations]
    WHERE CommonAreaId IN (SELECT Id FROM #TargetCommonAreas)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR UserId IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [dbo].[AnnouncementRecipients]
    WHERE AnnouncementId IN (SELECT Id FROM #TargetAnnouncements)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR ResidentId IN (SELECT Id FROM #TargetResidents);

    DELETE FROM [dbo].[AnnouncementAttachments]
    WHERE AnnouncementId IN (SELECT Id FROM #TargetAnnouncements);

    DELETE FROM [dbo].[ForumPostAttachments]
    WHERE ForumPostId IN (SELECT Id FROM #TargetForumPosts);

    DELETE FROM [dbo].[ForumComments]
    WHERE ForumPostId IN (SELECT Id FROM #TargetForumPosts)
       OR AuthorId IN (SELECT Id FROM #TargetResidents);

    DELETE FROM [dbo].[IncidentAttachments]
    WHERE IncidentId IN (SELECT Id FROM #TargetIncidents);

    DELETE FROM [dbo].[IncidentComments]
    WHERE IncidentId IN (SELECT Id FROM #TargetIncidents)
       OR UserId IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [dbo].[MeetingAttendees]
    WHERE MeetingId IN (SELECT Id FROM #TargetMeetings)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR ResidentId IN (SELECT Id FROM #TargetResidents);

    DELETE FROM [dbo].[PollVotes]
    WHERE PollId IN (SELECT Id FROM #TargetPolls)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR ResidentId IN (SELECT Id FROM #TargetResidents);

    DELETE FROM [dbo].[PollOptions]
    WHERE PollId IN (SELECT Id FROM #TargetPolls);

    DELETE FROM [dbo].[Payments]
    WHERE ChargeId IN (SELECT Id FROM #TargetCharges)
      OR CreatedBy LIKE N'%@e2e.local%'
      OR CreatedBy LIKE N'%@demo.test%';

    DELETE FROM [dbo].[Notifications]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR UserId IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [dbo].[CondominiumMapMarkers]
    WHERE BuildingId IN (SELECT Id FROM #TargetBuildings)
       OR UnitId IN (SELECT Id FROM #TargetUnits);

    DELETE FROM [dbo].[CondominiumMaps]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums);

    DELETE FROM [dbo].[Reservations]
    WHERE Id IN (SELECT Id FROM #TargetReservations);

    DELETE FROM [dbo].[Visits]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR RequestedById IN (SELECT Id FROM #TargetUsers)
      OR VisitorEmail LIKE N'%@e2e.local%'
      OR VisitorEmail LIKE N'%@demo.test%'
       OR VisitorName LIKE N'%E2E%';

    DELETE FROM [dbo].[Announcements]
    WHERE Id IN (SELECT Id FROM #TargetAnnouncements);

    DELETE FROM [dbo].[ForumPosts]
    WHERE Id IN (SELECT Id FROM #TargetForumPosts);

    DELETE FROM [dbo].[Meetings]
    WHERE Id IN (SELECT Id FROM #TargetMeetings);

    DELETE FROM [dbo].[Polls]
    WHERE Id IN (SELECT Id FROM #TargetPolls);

    DELETE FROM [dbo].[Incidents]
    WHERE Id IN (SELECT Id FROM #TargetIncidents);

    DELETE FROM [ops].[ResidentProcedures]
    WHERE Id IN (SELECT Id FROM #TargetProcedures);

    DELETE FROM [dbo].[Invoices]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR UnitId IN (SELECT Id FROM #TargetUnits)
       OR ResidentId IN (SELECT Id FROM #TargetResidents)
      OR CreatedBy LIKE N'%@e2e.local%'
      OR CreatedBy LIKE N'%@demo.test%';

    DELETE FROM [dbo].[Charges]
    WHERE Id IN (SELECT Id FROM #TargetCharges);

    DELETE FROM [dbo].[FeeConfigurations]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums);

    DELETE FROM [dbo].[CondominiumCommonAreas]
    WHERE CondominiumId IN (SELECT Id FROM #TargetCondominiums)
       OR BuildingId IN (SELECT Id FROM #TargetBuildings);

    DELETE FROM [dbo].[Amenities]
    WHERE Id IN (SELECT Id FROM #TargetAmenities);

    DELETE FROM [condo].[Residents]
    WHERE Id IN (SELECT Id FROM #TargetResidents);

    DELETE FROM [condo].[Units]
    WHERE Id IN (SELECT Id FROM #TargetUnits);

    DELETE FROM [condo].[Buildings]
    WHERE Id IN (SELECT Id FROM #TargetBuildings);

    DELETE FROM [condo].[CommonAreas]
    WHERE Id IN (SELECT Id FROM #TargetCommonAreas);

    DELETE FROM [billing].[Subscriptions]
    WHERE Id IN (SELECT Id FROM #TargetSubscriptions);

    DELETE FROM [auth].[Users]
    WHERE Id IN (SELECT Id FROM #TargetUsers);

    DELETE FROM [condo].[Condominiums]
    WHERE Id IN (SELECT Id FROM #TargetCondominiums);

    COMMIT TRANSACTION;

    PRINT 'Cleanup completed successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;