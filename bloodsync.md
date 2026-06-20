### The happy route

## To be a Volunteer or Phlebotomist
1. Should register an email and password
2. Newly created account will not be activated/usable yet
3. After creating an account, the volunteer/phlebotomist should provide necessary requirements needed (on the backend)
4. The new account will only be activated and usable after the admin check the requirements and set their account to active
5. Admin are responsible for the new account to be activated
6. The account will remain "pending" until the activation is done
7. The volunteer/phlebotomist can only register one email account
8. If the account is denied by the admin, the volunteer/phlebotomist are allowed to reuse the same email to try again
9. If the email used in new account that is pending, that email cannot be reused to register other account

## Blood Drive Creation
1. Admin and Staff are both allowed to create a blood drive
2. The PRC Branch/Blood Bank will be set during the creation of blood drive
3. Admin can pick a prc branch to where the collected blood from the blood drive will go during blood drive creation
4. Staff cannot assign a branch to a blood drive, the branch will be automatically set based on where the specific staff is currently in
5. A PRC staff of Lipa branch can create a blood drive with collected blood destination to Lipa Branch automatically
6. You can assign the volunteers/phlebotomists that will participate in the blood drive
7. Even after creation of blood drive, admin and staff can still add/remove the assigned volunteer/phlebotomist
8. A Blood Drive is editable when its upcoming or ongoing, updating is not allowed on cancelled or ended blood drives
9. The assigned volunteers/phlebotomists will be notified through email that they are selected to a blood drive
10. The volunteer/phlebotomist can "accept" or "deny" the blood drive - (the process is stated in the backend structure)
11. The admin/staff will have a choice to automatically choose the target count of volunteers/phlebotomist in a blood drive and the system will automatically select the nearest
    volunteers/phlebotomists based on their given address. The other choice is to manually select/drag one by one
12. The admin/staff can monitor the situation of the blood drive, how many units are collected, how many new donors are registered, how many failed
13. The set date cannot be from yesterday and beyond
14. The system will use a map picker (Google Maps), instead of manually typing the address of the blood drive venue, users can just pin the location and input only like 
    building name(if not extracted by map picker) and floor number
15. Volunteers/Phlebotomist can also use pin location
16. The system can give the distance(km) of each volunteer/phlebotomist on the assigning in blood drive

## Blood Donation
1. Admin, Staff, Volunteer, Phlebotomist are all allowed to do the whole blood donation flow
2. Only assigned volunterr/phlebotomist in the blood drive are allowed to access, register donor, and do the workflow
3. Assigned volunteers/phlebotomists are only allowed to work insdie the set time and date on the blood drive details
4. Outside blood drive, all volunteers/phlebotomists, assigned or not, can still access and edit their profile details(limited)
5. Admin and Staff are not required to be assigned in a blood drive to register a donor, and do all the work until blood extraction. This is to allow a walkin to the branch
6. Blood Extracted that is ready for testing which is made by staff will automatically go to which branch the staff is
7. Admin can still choose which branch the extracted blood will go
8. The flow will begin in Donor Registration
9. The admin/staff/volunteer/phlebotomist cant register the same donor
10. If the donor say that he already registered in the past, the admin/staff/volunteer/phlebotomist can check the donor in a seach box
11. The admin/staff/volunteer/phlebotomist can search for the full name, or id number. If the donor is selected, the register form will be autofill
12. If the donor didnt say anything about he being a registered donor in the past, when the admin/staff/volunteer/phlebotomist type his last name, first name and birthdate
    , the system will auto detect that the system detect similar donor
13. The same work with the government/national id
14. The alert will only be trigger when the government id is the same OR last, first name and birthdate are all matched, if for example, birthdate didnt match but the whole name
    matches, it still will not be trigger
15. The system may have in-line message below about the same donor
16. A double authentication factor like checker should be use on clicking the register button, checking if there is really no detected match is registered
17. The donor details for the registration form will be based on the backend
18. The second stop is the Donor Interview
19. The list of questions will be fetch and will be given by the backend
20. The deferral based on the answer of YES or NO is also on the backend
21. There will be a search bar above to select a registered donor that will be in the interview
22. The search bar when clicked should show the scrollable list of the registered donor and will be filtered one by one based on what you would type in the seach bar
23. If one question is answered wrong, the donor cannot proceed to the next step
24. The donor will be recorded as deferred from the interview - (logic already in backend)
25. The third step is the Donor Screening
26. There will be a search bar above to select only the passed donor 
27. The search bar when clicked should show the scrollable list of the passed donor and will be filtered one by one based on what you would type in the seach bar
28. Screening is where the hemoglobin and blood type is set
29. The donor should pass the hemoglobin test, the constant rule is in the backend
30. The fourth step is the blood extraction
31. There will be a search bar above to select only the passed donor from the screening
32. The search bar when clicked should show the scrollable list of the passed donor from screening and will be filtered one by one based on what you would type in the seach bar
33. The blood extraction time duration, and other details are based on backend constant rules
34. In this 4th step, the phlebotomist will be selected/assigned for the record, the phlebotomist who did the blood extraction
35. If the extraction duration does not meet the required time, the donor will be recorded as deferred by...
36. All donors who failed for said steps will be recorded based on which step did they failed
37. The extracted blood will be send on the branch assigned in the blood drive and is ready for testing
38. The expiration date will be automatiocally set based from the extraction day of the blood
39. The registration should have a validation of 18 years old and above only
40. The age is automatically computed based on the birthdate
41. Calendar on age should not allow selection of tomorrow and beyond

## Blood Testing
1. Blood testing will be done by staff only
2. The extracted blood and all the untested units will be held in the blood collection inventory
3. If the blood unit passed all the testing(outside the scope of the system), the staff can change the blood unit status from pending to available
4. The tested blood unit will go to the main inventory which is blood unit
5. The namings of tables should not know by the frontend, paths should be used - stated in the rules
6. The main inventory are the units available and are ready for the release

## Blood Separation
1. The system will allow the staff to separate the whole blood unit into three components(RBC, plasma, and platelet)
2. The allowed whole blood that will be used for separation are the tested ones, meaning the whole blood that are in the main inventory
3. The separated blood components will go back together with the untested ones
4. the three separated components(RBC, plasma, platelet) should all undergo with testing again
5. The expiration of the separated components will start from the moment they are separated, not based on the expiration of the whole blood

## Blood Unit Inventory
1. Admin and staff can view all blood units available
2. Admin can view inventory from each branch, staff can only view the inventory of their branch
3. There will be a section for Inventory Cleaning
4. Inside will view all the units with expiration dates highlighted
5. The list is arranged with expired at the top
6. The expired ones are highlighted with red, the nearing are orange, the good one have no highlights
7. The staff can either select each expired unit or select all
8. There will be a modal alert that will display all selected blood unit to be removed in the inventory
9. In the main blood unit list, there will be a button that will expand to use for removing the unit
10. To avoid accidental deletion fro mthe inventory, there will be a modal that will display a warning that this unit is not yet expired, are you sure, etc...
11. The system will require the staff to type the word remove" for better protection

## Blood Request
1. The Requestor can register their account on their own
2. To request a blood, the first step is the requestor will be put on the first page
3. The first page will consist of blood type and blood component
4. The requestor can select a blood type by clicking the blood type container, and the count by how many times the requestor click the container
5. The blood component selection will be below
6. The selected component will be highlighted
7. There will be a display at the very top showing the list of selected blood component and its blood type
8. The requestor are free to select 2 units of blood type O+ of RBC component and 1 unit of blood type AB+ of whole blood
9. After selection, the next step will show the prc branches/blood banks
10. After selecting blood type and component with count, the system will automatically select the nearest branch from the requestor, just display the confirmation details with
    the system's branch choice with distance in km.
11. The system may also display instead a recommented prc branch based from the nearest which the requetor can select instead of automatic
12. If the selected blood unit is not available on the nearest branch, the branch that will be selected is the second nearest
13. If the selected blood unit count by the requestor is not available in nearest branch, the system will redirect to the nearest that have the selected count
14. If the selected blood unit count by the requetor is not available or cannot be get from a any single branch, the system will automatically separate the blood unit
15. For example, if the requestor request for 6 items of platelet and not a single branch have 6 counts total, but still have a platelet, and the newarest only have 4 units,
    the selection will be 4 units from the nearest and other 2 will be the next nearest
16. If the requested is 6 and the nearest only have 4, and the second nearest have 8, the system will display the recommended is the second nearest, but will also have another
    choices of splitting with 4 in nearest and 2 in seconrd nearest.
17. The requestor should have freedom but at the same time, the system will lighten the work by showing recommendation
18. Before proceeding, the blood request form is required for submission to be checked by the staff
19. The staff are responsible to accept or decline the blood request based on the legitimacy of the blood request form
20. Together with the upload of the file document in the same page, the requestor will select a hospital which the request form is from
21. The hospital will be selected from a seach bar, upon clicking the seach bar, the list of all available hospital will be shown, and will be filtered one by one upon typing
    on the search bar
22. Upon sending the request, the system should display the approximate time the requestor will receive a respond should be displayed
23. The requestor should know how long should he wait for the request if its accepted or not - (constant logic in backend)
24. Upon accepting the request, on the side of the staff. The system will automatically select the unit will the nearest expiry, but not the unit with only one day left
25. This will prevent units expiring more often. the old ones from the invenotry should be selected first, not the newly arrived/tested
26. The selected unit for release for the request will have a status from "available" to "waiting" - (not yet implemented in the backend)
27. The will be another page showing all the units grouped by the request waiting to be release and accepted by the requestor
28. In the requestor side, there will be the request status with the button of "already received"
29. If the requestor clicked the button "already received", the request from the another page on the side of the staff will be removed and the blood unit status will be changed
    from "waiting" to "released" - (not yet implemented in the backend)
30. If the requestor forgot to do that last step/ failed to to the last step, the staff can still have an option to release the units grouped by the request
31. The system will diplay a modal with required typing "release" to avoid accidental clicking
32. An email notification will be automated after a successful request that will be receive by the requestor 
33. The email that will be used in email automation will be based on the email used by the requestor upon registration and login

## Admin's User Section
1. Can view all users and their status if online
2. Can create staff and admin account 
3. When creating account, the admin will input first name, last name, email
4. The password will be auto generated randomly with 12 letters and numbers
5. The user will be notified through email automation with the account creation and the email and password that will be used
6. In the email, there will be a message recommending to change the password into the users want or can just leave it be

